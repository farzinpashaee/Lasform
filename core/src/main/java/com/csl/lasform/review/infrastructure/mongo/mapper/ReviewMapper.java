package com.csl.lasform.review.infrastructure.mongo.mapper;

import com.csl.lasform.review.domain.model.Review;
import com.csl.lasform.review.infrastructure.mongo.document.ReviewDocument;

public final class ReviewMapper {

    private ReviewMapper() {
    }

    public static Review toDomain(ReviewDocument document) {
        if (document == null) {
            return null;
        }
        return Review.builder()
                .id(document.getId())
                .locationId(document.getLocationId())
                .userId(document.getUserId())
                .rating(document.getRating())
                .reviewText(document.getReviewText())
                .status(document.getStatus())
                .deleted(document.isDeleted())
                .deletedAt(document.getDeletedAt())
                .deletedBy(document.getDeletedBy())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .createdBy(document.getCreatedBy())
                .updatedBy(document.getUpdatedBy())
                .build();
    }

    public static ReviewDocument toDocument(Review domain) {
        if (domain == null) {
            return null;
        }
        return ReviewDocument.builder()
                .id(domain.getId())
                .locationId(domain.getLocationId())
                .userId(domain.getUserId())
                .rating(domain.getRating())
                .reviewText(domain.getReviewText())
                .status(domain.getStatus())
                .deleted(domain.isDeleted())
                .deletedAt(domain.getDeletedAt())
                .deletedBy(domain.getDeletedBy())
                .createdAt(domain.getCreatedAt())
                .updatedAt(domain.getUpdatedAt())
                .createdBy(domain.getCreatedBy())
                .updatedBy(domain.getUpdatedBy())
                .build();
    }
}
