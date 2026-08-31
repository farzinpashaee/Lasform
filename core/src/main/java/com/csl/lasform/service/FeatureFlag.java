package com.csl.lasform.service;

/**
 * The fixed, code-defined catalog of togglable platform features — the single source of truth
 * {@link FeatureFlagService} resolves against {@link com.csl.lasform.model.entity.ConfigEntry}
 * rows for. Adding a new toggle means adding a constant here (and wiring whatever it should
 * gate), not an admin-facing "create a flag" endpoint — same rationale as {@code PermissionKey}.
 *
 * <p>Every key lives under the {@code lasform.} prefix specifically so {@link
 * FeatureFlagController}'s public catalog endpoint can filter {@code config_entries} down to
 * "just the feature toggles" by prefix alone; nothing sensitive (API keys, client ids) should
 * ever be stored under that prefix.
 */
public enum FeatureFlag {
    DARK_MODE(
            "lasform.ui.darkMode",
            "Lasform UI",
            "Dark Mode",
            "Lets users switch the interface to a dark color theme.",
            true),
    MAP_CLUSTERING(
            "lasform.map.clustering",
            "Map Features",
            "Marker Clustering",
            "Lets users group nearby map markers into clusters at lower zoom levels.",
            true),
    LOCATION_REVIEWS(
            "lasform.location.reviews",
            "Location Features",
            "Location Reviews",
            "Lets users rate and review locations; hides ratings/reviews everywhere when off.",
            true),
    GOOGLE_SSO(
            "lasform.security.googleSso",
            "Security Features",
            "Google SSO Login",
            "Lets users sign in or sign up with their Google account.",
            false);

    private final String key;
    private final String category;
    private final String label;
    private final String description;
    private final boolean defaultEnabled;

    FeatureFlag(String key, String category, String label, String description, boolean defaultEnabled) {
        this.key = key;
        this.category = category;
        this.label = label;
        this.description = description;
        this.defaultEnabled = defaultEnabled;
    }

    public String key() {
        return key;
    }

    public String category() {
        return category;
    }

    public String label() {
        return label;
    }

    public String description() {
        return description;
    }

    public boolean defaultEnabled() {
        return defaultEnabled;
    }
}
