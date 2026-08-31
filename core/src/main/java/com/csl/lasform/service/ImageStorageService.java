package com.csl.lasform.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/**
 * Raw disk I/O for entity images, entity-agnostic: files live at
 * {@code {basePath}/{ownerId}/{filename}}, one subfolder per owning entity.
 */
public interface ImageStorageService {

    /**
     * Saves {@code file} under {@code ownerId}'s folder, using its (sanitized) original filename.
     *
     * @return the filename the file was actually stored under
     * @throws IllegalArgumentException if the file is empty, not an image, or its name is invalid
     * @throws com.csl.lasform.exception.DuplicateResourceException if that owner already has a file
     *     with the same name
     */
    String store(String ownerId, MultipartFile file);

    /**
     * @throws com.csl.lasform.exception.ResourceNotFoundException if no such file exists
     */
    Resource load(String ownerId, String filename);

    /** No-op if the file doesn't exist. */
    void delete(String ownerId, String filename);

    /** Removes the owner's entire image folder, if any. Called when the owning entity is deleted. */
    void deleteAll(String ownerId);
}
