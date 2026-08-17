package com.csl.lasform.review.infrastructure.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** {@code reviewText} is optional — a star rating alone is a valid review. */
public record ReviewRequest(
        @NotNull(message = "{validation.review.rating.required}")
                @Min(value = 1, message = "{validation.review.rating.min}")
                @Max(value = 5, message = "{validation.review.rating.max}")
                Integer rating,
        @Size(max = 2000, message = "{validation.review.reviewText.tooLong}") String reviewText) {
}
