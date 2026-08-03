package com.csl.lasform.service.impl;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.multipart.MultipartFile;

import com.csl.lasform.model.entity.Image;
import com.csl.lasform.model.entity.Location;
import com.csl.lasform.repository.LocationRepository;
import com.csl.lasform.service.ImageStorageService;
import com.csl.lasform.service.LocationService;

@Service
@Validated
public class LocationServiceImpl extends AbstractCrudService<Location, String> implements LocationService {

    private final LocationRepository locationRepository;
    private final ImageStorageService imageStorageService;
    private final EntityImageService<Location> imageService;

    public LocationServiceImpl(LocationRepository locationRepository, ImageStorageService imageStorageService) {
        super(locationRepository);
        this.locationRepository = locationRepository;
        this.imageStorageService = imageStorageService;
        this.imageService = new EntityImageService<>(locationRepository, imageStorageService, "Location");
    }

    @Override
    public GeoResults<Location> findNear(Point point, Distance distance) {
        return locationRepository.findByPointNear(point, distance);
    }

    @Override
    public List<Location> findByCategoryId(String categoryId) {
        return locationRepository.findByCategoryIdsContaining(categoryId);
    }

    @Override
    public List<Location> findByTag(String tag) {
        return locationRepository.findByTagsContaining(tag);
    }

    @Override
    public List<Location> findByTagsIn(List<String> tags) {
        return locationRepository.findByTagsIn(tags);
    }

    @Override
    protected void applyUpdate(Location existing, Location incoming) {
        existing.setPoint(incoming.getPoint());
        existing.setName(incoming.getName());
        existing.setDescription(incoming.getDescription());
        existing.setAltitude(incoming.getAltitude());
        existing.setAddress(incoming.getAddress());
        existing.setCategoryIds(incoming.getCategoryIds());
        existing.setTags(incoming.getTags());
        existing.setImages(incoming.getImages());
        existing.setRecordedAt(incoming.getRecordedAt());
        existing.setMetadata(incoming.getMetadata());
    }

    @Override
    protected String entityName() {
        return "Location";
    }

    @Override
    protected void afterDelete(String id) {
        imageStorageService.deleteAll(id);
    }

    @Override
    public Image addImage(String ownerId, MultipartFile file, boolean primary) {
        return imageService.addImage(ownerId, file, primary);
    }

    @Override
    public Resource loadImage(String ownerId, String filename) {
        return imageService.loadImage(ownerId, filename);
    }

    @Override
    public void deleteImage(String ownerId, String filename) {
        imageService.deleteImage(ownerId, filename);
    }

    @Override
    public Image setPrimaryImage(String ownerId, String filename) {
        return imageService.setPrimaryImage(ownerId, filename);
    }
}
