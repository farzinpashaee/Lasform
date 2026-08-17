package com.csl.lasform.review.infrastructure.web.dto;

import com.csl.lasform.review.domain.model.ReviewStatus;

import jakarta.validation.constraints.NotNull;

/** {@code status} must be PUBLISHED or REJECTED — PENDING is rejected by ReviewService#transitionStatus (400), it's never a valid moderation target. */
public record ReviewStatusUpdateRequest(@NotNull(message = "{validation.review.status.required}") ReviewStatus status) {
}
