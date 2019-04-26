package com.lasform.core.business.service;

import com.lasform.core.business.repository.GeoFenceRepository;
import com.lasform.core.business.specifications.GeoFenceSpecification;
import com.lasform.core.model.dto.GeoFenceDto;
import com.lasform.core.model.entity.GeoFence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GeoFenceService {

    @Autowired
    GeoFenceRepository geoFenceRepository;

    public GeoFence findById(long id ){ return geoFenceRepository.findById(id).get(); }

    public GeoFence findByName(String name ) { return geoFenceRepository.findByName( name ); }

    public List<GeoFence> search( GeoFenceDto geoFenceDto ){
        return geoFenceRepository.findAll( new GeoFenceSpecification().search(geoFenceDto));
    }


}
