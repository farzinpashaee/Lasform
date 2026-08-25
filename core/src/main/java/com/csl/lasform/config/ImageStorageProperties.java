package com.csl.lasform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;

import lombok.Getter;
import lombok.Setter;

/**
 * Where {@link com.csl.lasform.model.entity.Location}/{@link com.csl.lasform.model.entity.Device}
 * images are stored on disk: {@code {basePath}/{entityId}/{filename}}, one subfolder per entity.
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
}
