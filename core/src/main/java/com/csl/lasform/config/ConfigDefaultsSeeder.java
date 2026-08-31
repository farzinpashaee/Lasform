package com.csl.lasform.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.csl.lasform.service.ConfigService;

import jakarta.annotation.PostConstruct;

/**
 * Seeds optional operator-supplied defaults into specific {@code config_entries} on first boot:
 * if an env var/{@code application.yml} value is set <em>and</em> that key has no entry yet, it's
 * copied in once. From then on the database — and the admin Settings UI backed by it — is the
 * sole source of truth: this never overwrites an existing entry, so a saved admin value always
 * wins on every later restart, even if the env var changes or is removed.
 *
 * <p>This is the seed-once counterpart to {@code ImageStorageSettingsService}'s live-merge-on-read
 * approach — appropriate here because these particular values (an API key, an OAuth client id)
 * have no sensible non-blank code-level default the way a storage path or file-size cap does, so
 * there's nothing useful to fall back to on every read; either an operator seeded one via env var,
 * or an admin sets one later, or the feature that needs it just stays unconfigured.
 *
 * <p>Adding another operator-seedable config key means adding one {@code @Value} field, one
 * {@code lasform.config-defaults.*} entry in {@code application.yml}, and one {@link
 * #seedIfAbsent} call below — same shape every time.
 */
@Component
public class ConfigDefaultsSeeder {

    private static final String GOOGLE_MAPS_API_KEY = "map.google.api.key";
    private static final String GOOGLE_SSO_CLIENT_ID = "lasform.security.sso.google.client.id";

    private final ConfigService configService;

    @Value("${lasform.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${lasform.config-defaults.google-maps-api-key:}")
    private String googleMapsApiKey;

    @Value("${lasform.config-defaults.google-sso-client-id:}")
    private String googleSsoClientId;

    public ConfigDefaultsSeeder(ConfigService configService) {
        this.configService = configService;
    }

    @PostConstruct
    void seed() {
        if (!seedEnabled) {
            return;
        }
        seedIfAbsent(GOOGLE_MAPS_API_KEY, googleMapsApiKey);
        seedIfAbsent(GOOGLE_SSO_CLIENT_ID, googleSsoClientId);
    }

    private void seedIfAbsent(String key, String defaultValue) {
        if (StringUtils.hasText(defaultValue) && configService.findByKey(key).isEmpty()) {
            configService.upsert(key, defaultValue);
        }
    }
}
