package com.csl.lasform.service.impl;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.model.entity.Location;
import com.csl.lasform.repository.LocationRepository;
import com.csl.lasform.service.LocationService;

import jakarta.validation.Valid;

@Service
@Validated
public class LocationServiceImpl extends AbstractCrudService<Location, String> implements LocationService {

    private final LocationRepository locationRepository;

    public LocationServiceImpl(LocationRepository locationRepository) {
        super(locationRepository);
        this.locationRepository = locationRepository;
    }

    @Override
    public Location create(@Valid Location entity) {
        return super.create(entity);
    }

    @Override
    public List<Location> findByDeviceIdOrderByRecordedAtDesc(String deviceId) {
        return locationRepository.findByDeviceIdOrderByRecordedAtDesc(deviceId);
    }

    @Override
    public Optional<Location> findLatestByDeviceId(String deviceId) {
        return locationRepository.findFirstByDeviceIdOrderByRecordedAtDesc(deviceId);
    }

    @Override
    public List<Location> findByDeviceIdAndRecordedAtBetween(String deviceId, Instant from, Instant to) {
        return locationRepository.findByDeviceIdAndRecordedAtBetween(deviceId, from, to);
    }

    @Override
    public GeoResults<Location> findNear(Point point, Distance distance) {
        return locationRepository.findByPointNear(point, distance);
    }

    @Override
    protected void applyUpdate(Location existing, Location incoming) {
        existing.setPoint(incoming.getPoint());
        existing.setAltitude(incoming.getAltitude());
        existing.setSpeed(incoming.getSpeed());
        existing.setHeading(incoming.getHeading());
        existing.setAccuracy(incoming.getAccuracy());
        existing.setAddress(incoming.getAddress());
        existing.setRecordedAt(incoming.getRecordedAt());
        existing.setMetadata(incoming.getMetadata());
    }

    @Override
    protected String entityName() {
        return "Location";
    }
}
