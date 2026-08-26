package com.csl.lasform.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;

import lombok.Getter;
import lombok.Setter;

/**
 * Environment-configured defaults for where/how {@link com.csl.lasform.model.entity.Location}/
 * {@link com.csl.lasform.model.entity.Device} images are stored: {@code {basePath}/{entityId}/{filename}},
 * one subfolder per entity. These are the factory defaults an admin sees before ever touching the
 * General Settings page — {@link com.csl.lasform.service.ImageStorageSettingsService} serves the
 * effective value, preferring a {@link com.csl.lasform.model.entity.ConfigEntry} override (editable
 * at runtime, no restart) over the field here.
 */
@Component
@ConfigurationProperties(prefix = "lasform.storage.images")
@Getter
@Setter
public class ImageStorageProperties {

    /** Root directory images are stored under; each entity's images live in a subfolder named after its id. */
    private String basePath = "./data/images";

    /**
     * Per-image cap enforced by {@code FileSystemImageStorageService}, independent of (and tighter
     * than) {@code spring.servlet.multipart.max-file-size}, which is a blunt ceiling shared by every
     * multipart endpoint. Must stay at or below that global cap or it can never trigger — Spring
     * rejects the request while parsing the multipart body, before this check ever runs.
     */
    private DataSize maxFileSize = DataSize.ofMegabytes(5);

    /**
     * File extensions (no leading dot, lower-case) accepted on upload. Only extensions in
     * {@code ImageStorageSettingsService.SUPPORTED_EXTENSIONS} actually take effect — see there
     * for why the set can't just be whatever an admin types.
     */
    private List<String> allowedExtensions = List.of("jpg", "jpeg", "png");
}
