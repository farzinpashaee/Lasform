package com.lasform.core.business.service.implementation;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.business.repository.GeoAreaRepository;
import com.lasform.core.business.service.GeoAreaService;
import com.lasform.core.business.specifications.GeoAreaSpecifications;
import com.lasform.core.helper.AreaHelper;
import com.lasform.core.helper.JsonHelper;
import com.lasform.core.model.dto.GeoAreaDto;
import com.lasform.core.model.dto.LocationBoundary;
import com.lasform.core.model.entity.GeoArea;
import com.lasform.core.model.entity.GeoFence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GeoAreaServiceImp implements GeoAreaService {

    @Autowired
    GeoAreaRepository geoAreaRepository;

    public GeoArea findById( long id ){
        return geoAreaRepository.findById(id).get();
    }

    public List<GeoArea> findByName( String name ){
        return geoAreaRepository.findByName(name);
    }

    public List<GeoArea> findByNameContaining( String name ){
        return geoAreaRepository.findByNameContaining(name);
    }

    public List<GeoFence> findByGroupId(long groupId ){
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
            LocationBoundary areaBoundary = AreaHelper.calculateAreaBoundaryFromList(geoAreaDto);
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



    public List<GeoArea> search( GeoAreaDto geoAreaDto ){
        return geoAreaRepository.findAll(new GeoAreaSpecifications().search(geoAreaDto)) ;
    }

}
