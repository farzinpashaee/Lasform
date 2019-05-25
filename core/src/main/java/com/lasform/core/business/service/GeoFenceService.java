package com.lasform.core.business.service;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.model.dto.GeoFenceDto;
import com.lasform.core.model.entity.GeoFence;

import java.util.List;

public interface GeoFenceService {
    GeoFence findById(long id );
    GeoFence findByName(String name );
    List<GeoFence> search(GeoFenceDto geoFenceDto );
    GeoFence saveByList(GeoFenceDto geoFenceDto) throws EmptyFieldException;
}
