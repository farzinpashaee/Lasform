package com.csl.lasform.review.infrastructure.web.dto;

import java.time.Instant;

import com.csl.lasform.review.domain.model.Review;
import com.csl.lasform.review.domain.model.ReviewStatus;

public record ReviewResponse(
        String id,
        String locationId,
        String userId,
        Integer rating,
        String reviewText,
        ReviewStatus status,
        Instant createdAt,
        Instant updatedAt) {

    public static ReviewResponse from(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getLocationId(),
                review.getUserId(),
                review.getRating(),
                review.getReviewText(),
                review.getStatus(),
                review.getCreatedAt(),
                review.getUpdatedAt());
    }
}
