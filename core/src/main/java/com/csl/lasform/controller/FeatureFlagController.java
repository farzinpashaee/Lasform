package com.csl.lasform.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.service.FeatureFlagService;

/**
 * The full feature-flag catalog (key, category, label, description, current on/off state) —
 * deliberately unauthenticated, same rationale as {@code ConfigController#get}: whether dark
 * mode/clustering/reviews/Google SSO are enabled has to be knowable before a caller has
 * authenticated (the public map, the login page) or even seen the app shell render at all.
 * Nothing sensitive lives under the {@code lasform.} prefix this reads from — see {@link
 * com.csl.lasform.service.FeatureFlag}. Writing a flag's value is just a normal config write —
 * {@code PUT /api/v1/config/{key}} (config:write), no separate endpoint needed here.
 */
@RestController
@RequestMapping("/api/v1/feature-flags")
public class FeatureFlagController {

    private final FeatureFlagService featureFlagService;

    public FeatureFlagController(FeatureFlagService featureFlagService) {
        this.featureFlagService = featureFlagService;
    }

    @GetMapping
    public List<FeatureFlagStatus> list() {
        return featureFlagService.listAll();
    }
}
