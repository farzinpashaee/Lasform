package com.lasform.core.business.service;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.business.repository.GeoFenceRepository;
import com.lasform.core.business.specifications.GeoFenceSpecification;
import com.lasform.core.helper.AreaHelper;
import com.lasform.core.helper.JsonHelper;
import com.lasform.core.model.dto.GeoAreaDto;
import com.lasform.core.model.dto.GeoFenceDto;
import com.lasform.core.model.dto.LocationBoundary;
import com.lasform.core.model.entity.GeoArea;
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

    public GeoFence saveByList(GeoFenceDto geoFenceDto) throws EmptyFieldException {
        GeoArea geoArea = new GeoArea();
        GeoFence geoFence = new GeoFence();
        if( geoFenceDto.getName() == null) {
            throw new EmptyFieldException("Name field can not be empty");
        }
        if( geoFenceDto.getType() == null) {
            throw new EmptyFieldException("Type field can not be empty");
        }
        if( geoFenceDto.getGeoAreaDto().getAreaList() == null || geoFenceDto.getGeoAreaDto().getAreaList().size() == 0 ) {
            throw new EmptyFieldException("Area List field can not be empty");
        }
        if( geoFenceDto.getGeoAreaDto().getAreaNortheast() == null || geoFenceDto.getGeoAreaDto().getAreaSouthwest() == null ) {
            LocationBoundary areaBoundary = AreaHelper.calculateAreaBoundaryFromList(geoFenceDto.getGeoAreaDto());
            geoArea.setAreaNortheastLatitude(areaBoundary.getNortheast().getLatitude());
            geoArea.setAreaNortheastLongitude(areaBoundary.getNortheast().getLongitude());
            geoArea.setAreaSouthwestLatitude(areaBoundary.getSouthwest().getLatitude());
            geoArea.setAreaSouthwestLatitude(areaBoundary.getSouthwest().getLongitude());
        }
        geoArea.setName(geoFenceDto.getName());
        geoArea.setDescription(geoFenceDto.getDescription());
        geoArea.setArea( JsonHelper.areaListToJsonString(geoFenceDto.getGeoAreaDto().getAreaList()) );
        geoFence.setName(geoFenceDto.getName());
        geoFence.setDescription(geoFenceDto.getName());
        return geoFenceRepository.save(geoFence);
    }


}
