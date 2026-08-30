package com.csl.lasform.service;

import java.util.List;

import com.csl.lasform.model.entity.Geofence;
import com.csl.lasform.model.entity.enums.GeofenceStatus;

public interface GeofenceService extends CrudService<Geofence, String> {

    List<Geofence> findByOwnerId(String ownerId);

    List<Geofence> findByStatus(GeofenceStatus status);

    List<Geofence> findByDeviceId(String deviceId);
}
