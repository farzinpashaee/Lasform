package com.csl.lasform.service;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.util.unit.DataSize;

import com.csl.lasform.config.ImageStorageProperties;
import com.csl.lasform.model.entity.ConfigEntry;

/**
 * Resolves the effective image-storage settings (base path, allowed extensions, max file size)
 * against the generic {@link ConfigService} config-entry store, admin-editable from the General
 * Settings page: present wins, otherwise {@link ImageStorageProperties}' env-configured default.
 * Reading always goes straight to Mongo (via ConfigService, uncached) so a save takes effect on
 * the very next upload — no restart — same rationale as {@link FeatureFlagService}.
 */
@Service
public class ImageStorageSettingsService {

    public static final String BASE_PATH_KEY = "storage.images.base.path";
    public static final String ALLOWED_EXTENSIONS_KEY = "storage.images.allowed.extensions";
    public static final String MAX_FILE_SIZE_MB_KEY = "storage.images.max.file.size";

    /**
     * Every extension an admin is allowed to enable — deliberately fixed, not admin-defined:
     * each one needs a matching {@code javax.imageio.ImageIO} reader so
     * {@code FileSystemImageStorageService} can actually verify the upload's real content, and
     * SVG/etc. are excluded outright as an XSS/decompression-bomb risk. An extension outside this
     * set is dropped from a stored value rather than accepted and left to fail every upload.
     */
    public static final Set<String> SUPPORTED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "bmp");

    private final ConfigService configService;
    private final ImageStorageProperties defaults;

    public ImageStorageSettingsService(ConfigService configService, ImageStorageProperties defaults) {
        this.configService = configService;
        this.defaults = defaults;
    }

    public Path basePath() {
        String configured = configuredValue(BASE_PATH_KEY);
        String path = StringUtils.hasText(configured) ? configured : defaults.getBasePath();
        return Paths.get(path).toAbsolutePath().normalize();
    }

    public Set<String> allowedExtensions() {
        String configured = configuredValue(ALLOWED_EXTENSIONS_KEY);
        Collection<String> raw = StringUtils.hasText(configured) ? Arrays.asList(configured.split(",")) : defaults.getAllowedExtensions();
        Set<String> normalized = raw.stream()
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(StringUtils::hasText)
                .filter(SUPPORTED_EXTENSIONS::contains)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return normalized.isEmpty() ? Set.copyOf(defaults.getAllowedExtensions()) : normalized;
    }

    public DataSize maxFileSize() {
        String configured = configuredValue(MAX_FILE_SIZE_MB_KEY);
        if (StringUtils.hasText(configured)) {
            try {
                long megabytes = Long.parseLong(configured.trim());
                if (megabytes > 0) {
                    return DataSize.ofMegabytes(megabytes);
                }
            } catch (NumberFormatException ignored) {
                // Falls through to the configured default below — a malformed stored value
                // shouldn't take uploads down.
            }
        }
        return defaults.getMaxFileSize();
    }

    private String configuredValue(String key) {
        return configService.findByKey(key).map(ConfigEntry::getValue).orElse(null);
    }
}
