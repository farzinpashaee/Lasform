package com.csl.lasform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

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
}
