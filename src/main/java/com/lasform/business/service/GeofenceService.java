package com.lasform.business.service;

import com.lasform.business.repository.GeofenceRepository;
import com.lasform.model.entity.Geofence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GeofenceService {

    @Autowired
    GeofenceRepository geofenceRepository;

    public Geofence findById( long id ){ return geofenceRepository.findById(id).get(); }



}
