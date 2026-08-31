package com.csl.lasform.service;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;

import com.csl.lasform.controller.FeatureFlagStatus;

/**
 * Resolves each {@link FeatureFlag} against the generic {@link ConfigService} config-entry store:
 * present and {@code "true"}/{@code "false"} wins, otherwise the flag's own default. Reading
 * always goes straight to Mongo (via ConfigService, uncached) so a toggle takes effect on the
 * very next check — no restart, no TTL to wait out.
 */
@Service
public class FeatureFlagService {

    private final ConfigService configService;

    public FeatureFlagService(ConfigService configService) {
        this.configService = configService;
    }

    public boolean isEnabled(FeatureFlag flag) {
        return configService
                .findByKey(flag.key())
                .map(entry -> Boolean.parseBoolean(entry.getValue()))
                .orElse(flag.defaultEnabled());
    }

    public List<FeatureFlagStatus> listAll() {
        return Arrays.stream(FeatureFlag.values())
                .map(flag -> new FeatureFlagStatus(flag.key(), flag.category(), flag.label(), flag.description(), isEnabled(flag)))
                .toList();
    }
}
