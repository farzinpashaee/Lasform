package com.csl.lasform.review.infrastructure.mongo.document;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.csl.lasform.review.domain.model.ReviewStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
@Document(collection = "reviews")
// Enforces the one-review-per-user-per-location rule at the DB level as a safety net beneath the
// application-level upsert logic (see ReviewService#upsert). Holds regardless of status/deleted —
// a soft-deleted or rejected review is still "the" review record for that pair under the upsert
// model, so a second document for the same pair is never valid.
@CompoundIndex(name = "review_location_user_unique", def = "{'locationId': 1, 'userId': 1}", unique = true)
public class ReviewDocument {

    @Id
    private String id;

    @Indexed
    private String locationId;

    private String userId;

    private Integer rating;

    private String reviewText;

    @Indexed
    private ReviewStatus status;

    private boolean deleted;

    private Instant deletedAt;

    private String deletedBy;

    private Instant createdAt;

    private Instant updatedAt;
}
