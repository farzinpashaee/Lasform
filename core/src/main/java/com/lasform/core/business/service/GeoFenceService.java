package com.lasform.core.business.service;

import com.lasform.core.business.repository.GeoFenceRepository;
import com.lasform.core.model.entity.GeoFence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GeoFenceService {

    @Autowired
    GeoFenceRepository geoFenceRepository;

    public GeoFence findById(long id ){ return geoFenceRepository.findById(id).get(); }

    public GeoFence findByName(String name ) { return geoFenceRepository.findByName( name ); }


}
