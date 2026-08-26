package com.csl.lasform.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.web.multipart.MultipartFile;

import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.model.entity.Image;
import com.csl.lasform.model.entity.Imageable;
import com.csl.lasform.service.ImageAttachable;
import com.csl.lasform.service.ImageStorageService;

/**
 * Shared {@link ImageAttachable} logic for any {@link Imageable} entity, so LocationServiceImpl
 * and DeviceServiceImpl don't each reimplement the same list-mutation rules. Not a Spring bean
 * itself — each owning service constructs its own instance, parameterized with its repository.
 */
class EntityImageService<T extends Imageable> implements ImageAttachable {

    private final MongoRepository<T, String> repository;
    private final ImageStorageService imageStorage;
    private final String ownerNotFoundMessageCode;

    EntityImageService(
            MongoRepository<T, String> repository, ImageStorageService imageStorage, String ownerNotFoundMessageCode) {
        this.repository = repository;
        this.imageStorage = imageStorage;
        this.ownerNotFoundMessageCode = ownerNotFoundMessageCode;
    }

    @Override
    public Image addImage(String ownerId, MultipartFile file, boolean primary) {
        T entity = getOrThrow(ownerId);
        String filename = imageStorage.store(ownerId, file);

        List<Image> images = currentImages(entity);
        boolean makePrimary = primary || images.isEmpty();
        if (makePrimary) {
            images.forEach(image -> image.setPrimary(false));
        }
        Image image = Image.builder().filename(filename).primary(makePrimary).build();
        images.add(image);
        entity.setImages(images);

        try {
            repository.save(entity);
        } catch (RuntimeException e) {
            // The file is already on disk at this point — without this, a save failure here
            // (e.g. an optimistic-locking conflict) would leave it permanently orphaned: never
            // referenced by the entity, but still occupying its filename forever.
            imageStorage.delete(ownerId, filename);
            throw e;
        }
        return image;
    }

    @Override
    public Resource loadImage(String ownerId, String filename) {
        getOrThrow(ownerId);
        return imageStorage.load(ownerId, filename);
    }

    @Override
    public void deleteImage(String ownerId, String filename) {
        T entity = getOrThrow(ownerId);
        List<Image> images = currentImages(entity);
        if (!images.removeIf(image -> image.getFilename().equals(filename))) {
            throw new ResourceNotFoundException("error.image.notFound", filename);
        }

        entity.setImages(images);
        repository.save(entity);
        imageStorage.delete(ownerId, filename);
    }

    @Override
    public Image setPrimaryImage(String ownerId, String filename) {
        T entity = getOrThrow(ownerId);
        List<Image> images = currentImages(entity);
        Image target = images.stream()
                .filter(image -> image.getFilename().equals(filename))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("error.image.notFound", filename));

        images.forEach(image -> image.setPrimary(image == target));
        entity.setImages(images);
        repository.save(entity);
        return target;
    }

    private List<Image> currentImages(T entity) {
        return entity.getImages() == null ? new ArrayList<>() : new ArrayList<>(entity.getImages());
    }

    private T getOrThrow(String ownerId) {
        return repository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException(ownerNotFoundMessageCode, ownerId));
    }
}
