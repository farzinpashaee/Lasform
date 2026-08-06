package com.csl.lasform.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.service.TagService;

/** Free-text tag autocomplete, aggregated across Location and Device. */
@RestController
@RequestMapping("/api/v1/tags")
public class TagController {

    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 50;

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    public List<String> suggest(@RequestParam(required = false) String prefix, @RequestParam(required = false) Integer limit) {
        int effectiveLimit = limit == null ? DEFAULT_LIMIT : limit;
        if (effectiveLimit < 1 || effectiveLimit > MAX_LIMIT) {
            throw new IllegalArgumentException("'limit' must be between 1 and " + MAX_LIMIT);
        }
        return tagService.suggest(prefix, effectiveLimit);
    }
}
