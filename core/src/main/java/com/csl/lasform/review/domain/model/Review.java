package com.csl.lasform.review.domain.model;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * A user's 1-5 star rating (+ optional text) for a {@code Location}. Exactly one per
 * {@code (locationId, userId)} pair — resubmitting updates the existing review instead of creating
 * a second one (see {@code ReviewService#upsert} and the compound unique index in the Mongo
 * infrastructure layer). Deletion is always a soft delete; nothing in this feature ever removes a
 * document. Plain POJO by design — no Mongo-specific types (see {@code ReviewDocument} for those).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class Review {

    private String id;

    private String locationId;

    private String userId;

    private Integer rating;

    private String reviewText;

    @Builder.Default
    private ReviewStatus status = ReviewStatus.PENDING;

    @Builder.Default
    private boolean deleted = false;

    private Instant deletedAt;

    private String deletedBy;

    private Instant createdAt;

    private Instant updatedAt;
}
