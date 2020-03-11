package com.lasform.core.business.service;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.model.dto.GeoAreaDto;
import com.lasform.core.model.entity.GeoArea;
import com.lasform.core.model.entity.GeoFence;

import java.util.List;

public interface GeoAreaService {
     GeoArea findById(long id );
     GeoArea findByName(String name );
     List<GeoArea> findByNameContaining( String name );
     List<GeoFence> findByGroupId(long groupId );
     GeoArea saveByList(GeoAreaDto geoAreaDto) throws EmptyFieldException;
     List<GeoArea> search( GeoAreaDto geoAreaDto );
}
