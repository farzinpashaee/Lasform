package com.csl.lasform.review.domain.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.csl.lasform.review.domain.model.Review;
import com.csl.lasform.review.domain.model.ReviewAggregate;
import com.csl.lasform.review.domain.model.ReviewStatus;

/**
 * Domain-owned port. {@code Pageable}/{@code Page} are Spring Data's framework-abstraction types,
 * not MongoDB-specific, so they're used directly here rather than inventing a parallel pagination
 * type — but {@code MongoTemplate}, aggregation pipeline stages, and any other Mongo-specific type
 * must never appear in this interface; those live only in {@code ReviewRepositoryAdapter}.
 */
public interface ReviewRepository {

    Review save(Review review);

    Optional<Review> findById(String id);

    Optional<Review> findByLocationIdAndUserId(String locationId, String userId);

    /** Public listing — {@code status = PUBLISHED} and {@code deleted = false} only. */
    Page<Review> findPublishedByLocationId(String locationId, Pageable pageable);

    /** Moderation queue — excludes soft-deleted reviews even if they're technically still PENDING. */
    Page<Review> findByStatus(ReviewStatus status, Pageable pageable);

    /**
     * Scoped to {@code status = PUBLISHED} and {@code deleted = false}. Implemented as a Mongo
     * aggregation ({@code $avg}/{@code $count} via {@code $group}) — never by loading every review
     * for a location into application memory.
     */
    ReviewAggregate aggregatePublished(String locationId);
}
