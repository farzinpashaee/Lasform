package com.csl.lasform.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.Geofence;
import com.csl.lasform.model.entity.enums.GeofenceStatus;

public interface GeofenceRepository extends MongoRepository<Geofence, String> {

    List<Geofence> findByOwnerId(String ownerId);

    List<Geofence> findByStatus(GeofenceStatus status);

    List<Geofence> findByDeviceIdsContaining(String deviceId);
}
