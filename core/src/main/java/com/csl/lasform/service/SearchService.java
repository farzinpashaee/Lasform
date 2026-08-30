package com.csl.lasform.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.csl.lasform.model.search.SearchHit;
import com.csl.lasform.model.search.SearchResultType;

/** Cross-entity search over Location and Device. */
public interface SearchService {

    /**
     * @param type     restricts the search to one entity kind; {@code null} searches both
     * @param category matches entities whose {@code categoryIds} contains this value, if given
     * @param tag      matches entities whose {@code tags} contains this value, if given
     * @param q        case-insensitive free-text match against {@code name} or any {@code tags} entry, if given
     */
    Page<SearchHit> search(SearchResultType type, String category, String tag, String q, Pageable pageable);
}
