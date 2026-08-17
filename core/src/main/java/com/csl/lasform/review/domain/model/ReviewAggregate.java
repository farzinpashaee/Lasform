package com.csl.lasform.review.domain.model;

/**
 * Result of aggregating a location's {@code PUBLISHED}, non-deleted reviews — see
 * {@code ReviewRepository#aggregatePublished}. Plain numeric result, never the raw review list, so
 * the domain/application layers never need to compute an average by loading documents in memory.
 */
public record ReviewAggregate(double averageRating, long reviewCount) {

    public static final ReviewAggregate EMPTY = new ReviewAggregate(0.0, 0);
}
