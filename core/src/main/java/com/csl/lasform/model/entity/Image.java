package com.csl.lasform.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * A single image belonging to a {@link Location} or {@link Device}. Only references the file;
 * the file itself lives on disk under {@code ImageStorageProperties.basePath}/{ownerId}/{filename}.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class Image {

    private String filename;

    /** Whether this is the entity's primary/cover image; at most one should be true per entity. */
    private boolean primary;
}
