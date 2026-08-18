package com.csl.lasform.review.application;

import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.model.entity.Location;
import com.csl.lasform.repository.LocationRepository;
import com.csl.lasform.review.domain.model.Review;
import com.csl.lasform.review.domain.model.ReviewAggregate;
import com.csl.lasform.review.domain.model.ReviewStatus;
import com.csl.lasform.review.domain.repository.ReviewRepository;

import lombok.RequiredArgsConstructor;

/**
 * Depends on the classic {@code LocationRepository} directly (not a domain port) because
 * {@code Location} isn't part of this hexagonal slice — it's the existing, non-hexagonal
 * entity/repository/service stack the rest of the CRUD controllers use, and there is no separate
 * "LocationRepository port" to depend on instead. That's an accepted seam between the two styles,
 * not an oversight.
 *
 * <p><b>Consistency window:</b> this app runs against a standalone (non-replica-set) MongoDB
 * instance — see core/README.md — so there is no {@code MongoTransactionManager} available to wrap
 * a review write and the resulting {@code Location} aggregate update in one transaction. Every
 * method below does the review write first, then recalculates and saves the location's
 * {@code averageRating}/{@code reviewCount} as a second, separate write. A crash between the two
 * leaves the location's stored aggregate briefly stale until the next write to that location's
 * reviews recalculates it — an accepted eventual-consistency window, not silently assumed-away
 * atomicity.
 */
@Component
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final LocationRepository locationRepository;

    /**
     * Upserts the caller's review for a location. Always resets {@code status} to PENDING and
     * clears any soft-delete — an edited review needs re-moderation, and a resubmit after deletion
     * un-deletes it, same record either way (see the compound unique index in the infra layer).
     */
    public Review upsert(String locationId, String userId, Integer rating, String reviewText) {
        if (!locationRepository.existsById(locationId)) {
            throw new ResourceNotFoundException("error.location.notFound", locationId);
        }

        Instant now = Instant.now();
        // Plain-text-only field (no markdown/HTML rendering is ever done for it) — HTML-escaped on
        // write so a stored value can never be interpreted as markup by a future frontend that
        // renders it, regardless of whether that frontend also does its own output-side escaping.
        String sanitizedText = sanitize(reviewText);

        Review review = reviewRepository
                .findByLocationIdAndUserId(locationId, userId)
                .map(existing -> {
                    existing.setRating(rating);
                    existing.setReviewText(sanitizedText);
                    existing.setStatus(ReviewStatus.PENDING);
                    existing.setDeleted(false);
                    existing.setDeletedAt(null);
                    existing.setDeletedBy(null);
                    existing.setUpdatedAt(now);
                    existing.setUpdatedBy(userId);
                    return existing;
                })
                .orElseGet(() -> Review.builder()
                        .locationId(locationId)
                        .userId(userId)
                        .rating(rating)
                        .reviewText(sanitizedText)
                        .status(ReviewStatus.PENDING)
                        .deleted(false)
                        .createdAt(now)
                        .updatedAt(now)
                        .createdBy(userId)
                        .updatedBy(userId)
                        .build());

        Review saved = reviewRepository.save(review);
        recalculateLocationAggregate(locationId);
        return saved;
    }

    /** Public listing — published, non-deleted reviews for a location. */
    public Page<Review> listPublished(String locationId, Pageable pageable) {
        return reviewRepository.findPublishedByLocationId(locationId, pageable);
    }

    /** Moderation queue — all PENDING reviews across every location. */
    public Page<Review> pendingQueue(Pageable pageable) {
        return reviewRepository.findByStatus(ReviewStatus.PENDING, pageable);
    }

    public void deleteOwn(String locationId, String userId) {
        Review review = reviewRepository
                .findByLocationIdAndUserId(locationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("error.review.notFoundForLocation", locationId));
        softDelete(review, userId);
    }

    public void deleteOthers(String reviewId, String callerId) {
        Review review =
                reviewRepository.findById(reviewId).orElseThrow(() -> new ResourceNotFoundException("error.review.notFound", reviewId));
        if (review.getUserId().equals(callerId)) {
            // review:delete_others must never operate on the caller's own review, regardless of
            // what other permissions they hold (e.g. an ADMIN who has both delete_own and
            // delete_others) — deleting your own review always goes through the /me endpoint.
            throw new AccessDeniedException("Use DELETE /api/locations/{locationId}/reviews/me to delete your own review.");
        }
        softDelete(review, callerId);
    }

    /**
     * Approves or rejects a review. Only PENDING reviews can be transitioned — see
     * {@link com.csl.lasform.review.domain.model.ReviewStatus} for why PUBLISHED/REJECTED are
     * terminal until the author resubmits (which resets status back to PENDING via {@link #upsert}).
     */
    public Review transitionStatus(String reviewId, ReviewStatus newStatus, String moderatorId) {
        if (newStatus != ReviewStatus.PUBLISHED && newStatus != ReviewStatus.REJECTED) {
            throw new BadRequestException("error.review.invalidTargetStatus", newStatus);
        }
        Review review =
                reviewRepository.findById(reviewId).orElseThrow(() -> new ResourceNotFoundException("error.review.notFound", reviewId));
        if (review.getStatus() != ReviewStatus.PENDING) {
            throw new BadRequestException("error.review.notPending", reviewId, review.getStatus());
        }

        review.setStatus(newStatus);
        review.setUpdatedAt(Instant.now());
        review.setUpdatedBy(moderatorId);
        Review saved = reviewRepository.save(review);
        recalculateLocationAggregate(review.getLocationId());
        return saved;
    }

    private void softDelete(Review review, String deletedByUserId) {
        Instant now = Instant.now();
        review.setDeleted(true);
        review.setDeletedAt(now);
        review.setDeletedBy(deletedByUserId);
        review.setUpdatedAt(now);
        review.setUpdatedBy(deletedByUserId);
        reviewRepository.save(review);
        recalculateLocationAggregate(review.getLocationId());
    }

    private String sanitize(String reviewText) {
        if (reviewText == null || reviewText.isBlank()) {
            return null;
        }
        return HtmlUtils.htmlEscape(reviewText.trim());
    }

    private void recalculateLocationAggregate(String locationId) {
        ReviewAggregate aggregate = reviewRepository.aggregatePublished(locationId);
        Location location = locationRepository
                .findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException("error.location.notFound", locationId));
        location.setAverageRating(aggregate.averageRating());
        location.setReviewCount((int) aggregate.reviewCount());
        locationRepository.save(location);
    }
}
