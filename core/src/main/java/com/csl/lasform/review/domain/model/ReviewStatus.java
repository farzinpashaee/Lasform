package com.csl.lasform.review.domain.model;

/**
 * A fresh upsert always resets a review to {@link #PENDING} (see ReviewService#upsert), so
 * {@link #PUBLISHED}/{@link #REJECTED} are terminal until the author resubmits — there is no
 * "unpublish"/"un-reject" transition in this feature.
 */
public enum ReviewStatus {
    PENDING,
    PUBLISHED,
    REJECTED
}
