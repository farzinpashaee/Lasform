package com.csl.lasform.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.model.search.SearchHit;
import com.csl.lasform.model.search.SearchResultType;
import com.csl.lasform.service.SearchService;

/** Cross-entity search over Location and Device, e.g. for a single map/search-bar UI. */
@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public Page<SearchHit> search(
            @RequestParam(required = false) SearchResultType type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) Integer size) {
        if (page < 0) {
            throw new IllegalArgumentException("'page' must not be negative");
        }
        int pageSize = size == null ? DEFAULT_PAGE_SIZE : size;
        if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("'size' must be between 1 and " + MAX_PAGE_SIZE);
        }
        return searchService.search(type, category, tag, q, PageRequest.of(page, pageSize));
    }
}
