package com.csl.lasform.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.model.entity.Geofence;
import com.csl.lasform.model.entity.enums.GeofenceStatus;
import com.csl.lasform.repository.GeofenceRepository;
import com.csl.lasform.service.GeofenceService;

import jakarta.validation.Valid;

@Service
@Validated
public class GeofenceServiceImpl extends AbstractCrudService<Geofence, String> implements GeofenceService {

    private final GeofenceRepository geofenceRepository;

    public GeofenceServiceImpl(GeofenceRepository geofenceRepository) {
        super(geofenceRepository);
        this.geofenceRepository = geofenceRepository;
    }

    @Override
    public Geofence create(@Valid Geofence entity) {
        return super.create(entity);
    }

    @Override
    public List<Geofence> findByOwnerId(String ownerId) {
        return geofenceRepository.findByOwnerId(ownerId);
    }

    @Override
    public List<Geofence> findByStatus(GeofenceStatus status) {
        return geofenceRepository.findByStatus(status);
    }

    @Override
    public List<Geofence> findByDeviceId(String deviceId) {
        return geofenceRepository.findByDeviceIdsContaining(deviceId);
    }

    @Override
    protected void applyUpdate(Geofence existing, Geofence incoming) {
        existing.setName(incoming.getName());
        existing.setDescription(incoming.getDescription());
        existing.setShape(incoming.getShape());
        existing.setCenter(incoming.getCenter());
        existing.setRadiusMeters(incoming.getRadiusMeters());
        existing.setBoundary(incoming.getBoundary());
        existing.setStatus(incoming.getStatus());
        existing.setDeviceIds(incoming.getDeviceIds());
    }

    @Override
    protected String entityName() {
        return "Geofence";
    }
}
