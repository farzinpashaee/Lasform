package com.csl.lasform.review.infrastructure.web;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.auth.infrastructure.security.JwtPrincipal;
import com.csl.lasform.review.application.ReviewService;
import com.csl.lasform.review.domain.model.Review;
import com.csl.lasform.review.infrastructure.web.dto.ReviewRequest;
import com.csl.lasform.review.infrastructure.web.dto.ReviewResponse;
import com.csl.lasform.review.infrastructure.web.dto.ReviewStatusUpdateRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * No shared {@code @RequestMapping} prefix — the two path families
 * ({@code /api/locations/{locationId}/reviews...} and {@code /api/reviews/...}) diverge
 * immediately, so each method declares its full path instead of a misleading common base.
 *
 * <p>Every method here is {@code @PreAuthorize}-gated on a permission ANONYMOUS never holds except
 * {@code review:view} (the public listing), so casting {@code Authentication#getPrincipal()} to
 * {@link JwtPrincipal} is always safe on the write/moderation endpoints — if the method body runs
 * at all, the caller is guaranteed to be authenticated, not Spring Security's anonymous principal.
 */
@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/api/locations/{locationId}/reviews")
    @PreAuthorize("hasAuthority('review:create')")
    public ReviewResponse upsert(
            @PathVariable String locationId, @Valid @RequestBody ReviewRequest request, Authentication authentication) {
        String userId = principal(authentication).userId();
        Review review = reviewService.upsert(locationId, userId, request.rating(), request.reviewText());
        return ReviewResponse.from(review);
    }

    @GetMapping("/api/locations/{locationId}/reviews")
    @PreAuthorize("hasAuthority('review:view')")
    public Page<ReviewResponse> list(@PathVariable String locationId, Pageable pageable) {
        return reviewService.listPublished(locationId, pageable).map(ReviewResponse::from);
    }

    @DeleteMapping("/api/locations/{locationId}/reviews/me")
    @PreAuthorize("hasAuthority('review:delete_own')")
    public ResponseEntity<Void> deleteOwn(@PathVariable String locationId, Authentication authentication) {
        reviewService.deleteOwn(locationId, principal(authentication).userId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/reviews/{reviewId}")
    @PreAuthorize("hasAuthority('review:delete_others')")
    public ResponseEntity<Void> deleteOthers(@PathVariable String reviewId, Authentication authentication) {
        reviewService.deleteOthers(reviewId, principal(authentication).userId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/reviews/pending")
    @PreAuthorize("hasAuthority('review:moderate')")
    public Page<ReviewResponse> pending(Pageable pageable) {
        return reviewService.pendingQueue(pageable).map(ReviewResponse::from);
    }

    @PatchMapping("/api/reviews/{reviewId}/status")
    @PreAuthorize("hasAuthority('review:moderate')")
    public ReviewResponse updateStatus(
            @PathVariable String reviewId, @Valid @RequestBody ReviewStatusUpdateRequest request, Authentication authentication) {
        Review review = reviewService.transitionStatus(reviewId, request.status(), principal(authentication).userId());
        return ReviewResponse.from(review);
    }

    private JwtPrincipal principal(Authentication authentication) {
        return (JwtPrincipal) authentication.getPrincipal();
    }
}
