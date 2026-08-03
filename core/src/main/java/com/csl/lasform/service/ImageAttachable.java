package com.csl.lasform.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import com.csl.lasform.model.entity.Image;

/** Attaches/detaches {@link Image}s on an owning entity (Location, Device), backed by {@link ImageStorageService}. */
public interface ImageAttachable {

    /**
     * Stores {@code file} and records it on the owner's image list. The first image added to an
     * owner becomes primary regardless of {@code primary}; otherwise, requesting {@code primary}
     * unsets any previous primary image.
     */
    Image addImage(String ownerId, MultipartFile file, boolean primary);

    Resource loadImage(String ownerId, String filename);

    void deleteImage(String ownerId, String filename);

    /** Marks the given image as primary, unsetting any other. */
    Image setPrimaryImage(String ownerId, String filename);
}
