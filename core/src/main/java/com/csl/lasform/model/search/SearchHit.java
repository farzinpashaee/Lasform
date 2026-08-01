package com.csl.lasform.model.search;

/**
 * A single result from the cross-entity search. {@code data} is a
 * {@link com.csl.lasform.model.entity.Location} or {@link com.csl.lasform.model.entity.Device},
 * according to {@code type}.
 */
public record SearchHit(SearchResultType type, Object data) {
}
