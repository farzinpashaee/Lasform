package com.lasform.core.business.service;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.core.business.repository.LocationTypeRepository;
import com.lasform.core.model.dto.LocationTypeDto;
import com.lasform.core.model.entity.LocationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationTypeService {

    @Autowired
    LocationTypeRepository locationTypeRepository;

    public List<LocationType> getLocationTypeList(){
        return locationTypeRepository.findAll();
    }

    public LocationType save(LocationTypeDto locationTypeDto ) throws EmptyFieldException {
        LocationType locationType = new LocationType();
        if( locationTypeDto.getName() == null || locationTypeDto.getName().equals("") ){
            throw new EmptyFieldException("Name field can not be empty");
        } else {
            locationType.setName(locationTypeDto.getName());
        }
        locationType.setDescription(locationTypeDto.getDescription());
        return  locationTypeRepository.save(locationType);
    }

    public LocationType update(LocationTypeDto locationTypeDto ) throws EmptyFieldException, UnrecognizedLocationTypeException {
        LocationType locationType = locationTypeRepository.findById(locationTypeDto.getId()).get();
        if( locationType == null ) throw new UnrecognizedLocationTypeException();
        if( locationTypeDto.getName() == null || locationTypeDto.getName().equals("") ){
            throw new EmptyFieldException("Name field can not be empty");
        } else {
            locationType.setName(locationTypeDto.getName());
        }
        locationType.setDescription(locationTypeDto.getDescription());
        return  locationTypeRepository.save(locationType);
    }

}
