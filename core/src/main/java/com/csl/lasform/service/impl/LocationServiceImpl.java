package com.csl.lasform.service.impl;

import java.util.List;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.model.entity.Location;
import com.csl.lasform.repository.LocationRepository;
import com.csl.lasform.service.LocationService;

@Service
@Validated
public class LocationServiceImpl extends AbstractCrudService<Location, String> implements LocationService {

    private final LocationRepository locationRepository;

    public LocationServiceImpl(LocationRepository locationRepository) {
        super(locationRepository);
        this.locationRepository = locationRepository;
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
        existing.setRecordedAt(incoming.getRecordedAt());
        existing.setMetadata(incoming.getMetadata());
    }

    @Override
    protected String entityName() {
        return "Location";
    }
}
