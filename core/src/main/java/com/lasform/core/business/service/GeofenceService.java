package com.lasform.core.business.service;

import com.lasform.core.business.repository.GeofenceRepository;
import com.lasform.core.model.entity.Geofence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GeofenceService {

    @Autowired
    GeofenceRepository geofenceRepository;

    public Geofence findById( long id ){ return geofenceRepository.findById(id).get(); }



}
