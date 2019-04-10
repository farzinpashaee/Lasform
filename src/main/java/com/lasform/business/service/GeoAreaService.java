package com.lasform.business.service;

import com.lasform.business.exceptions.EmptyFieldException;
import com.lasform.business.repository.GeoAreaRepository;
import com.lasform.helper.JsonHelper;
import com.lasform.model.dto.GeoAreaDto;
import com.lasform.model.dto.LatLng;
import com.lasform.model.dto.LocationBoundary;
import com.lasform.model.entity.GeoArea;
import com.lasform.model.entity.Geofence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
public class GeoAreaService {

    @Autowired
    GeoAreaRepository geoAreaRepository;

    public GeoArea findById( long id ){
        return geoAreaRepository.findById(id).get();
    }

    public List<Geofence> findByGroupId(long groupId ){
        return null;
    }

    public GeoArea saveByList(GeoAreaDto geoAreaDto) throws EmptyFieldException {
        GeoArea geoArea = new GeoArea();
        if( geoAreaDto.getName() == null) {
            throw new EmptyFieldException("Name field can not be empty");
        }
        if( geoAreaDto.getType() == null) {
            throw new EmptyFieldException("Type field can not be empty");
        }
        if( geoAreaDto.getAreaList() == null || geoAreaDto.getAreaList().size() == 0 ) {
            throw new EmptyFieldException("Area List field can not be empty");
        }
        if( geoAreaDto.getAreaNortheast() == null || geoAreaDto.getAreaSouthwest() == null ) {
            LocationBoundary areaBoundary = calculateAreaBoundaryFromList(geoAreaDto);
            geoArea.setAreaNortheastLatitude(areaBoundary.getNortheast().getLatitude());
            geoArea.setAreaNortheastLongitude(areaBoundary.getNortheast().getLongitude());
            geoArea.setAreaSouthwestLatitude(areaBoundary.getSouthwest().getLatitude());
            geoArea.setAreaSouthwestLatitude(areaBoundary.getSouthwest().getLongitude());
        }
        geoArea.setName(geoAreaDto.getName());
        geoArea.setDescription(geoAreaDto.getDescription());
        geoArea.setArea( JsonHelper.areaListToJsonString(geoAreaDto.getAreaList()) );
        return geoAreaRepository.save(geoArea);
    }

    public LocationBoundary calculateAreaBoundaryFromList(GeoAreaDto geoAreaDto ){
        LocationBoundary result = new LocationBoundary();
        int nodeSize = geoAreaDto.getAreaList().size();
        Double[] lats = new Double[nodeSize];
        Double[] lngs = new Double[nodeSize];
        for(int i = 0 ; i < nodeSize ; i++ ){
            lats[i] = Double.parseDouble( geoAreaDto.getAreaList().get(i).getLatitude() );
            lngs[i] = Double.parseDouble( geoAreaDto.getAreaList().get(i).getLongitude() );
        }
        result.setNortheast(new LatLng(Collections.max(Arrays.asList(lats)).toString() , Collections.max(Arrays.asList(lngs)).toString() ));
        result.setSouthwest(new LatLng(Collections.min(Arrays.asList(lats)).toString() , Collections.min(Arrays.asList(lngs)).toString() ));
        return result;
    }



}
