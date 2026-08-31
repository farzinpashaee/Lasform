package com.csl.lasform.controller;

/** A {@link com.csl.lasform.service.FeatureFlag}'s definition plus its currently-resolved state. */
public record FeatureFlagStatus(String key, String category, String label, String description, boolean enabled) {
}
