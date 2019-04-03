package com.lasform.business.service;


import com.lasform.business.exceptions.EmptyFieldException;
import com.lasform.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.business.repository.LocationGroupRepository;
import com.lasform.model.dto.LocationGroupDto;
import com.lasform.model.entity.LocationGroup;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationGroupServices {

    @Autowired
    LocationGroupRepository locationGroupRepository;

    public List<LocationGroup> getLocationGroupList(){
        return locationGroupRepository.findAll();
    }

    public LocationGroup save(LocationGroupDto locationGroupDto ) throws EmptyFieldException {
        LocationGroup locationGroup = new LocationGroup();
        if( locationGroupDto.getName() == null || locationGroupDto.getName().equals("") ){
            throw new EmptyFieldException("Name field can not be empty");
        } else {
            locationGroup.setName(locationGroupDto.getName());
        }
        locationGroup.setDescription(locationGroupDto.getDescription());
        return locationGroupRepository.save(locationGroup);
    }

    public LocationGroup update(LocationGroupDto locationGroupDto ) throws EmptyFieldException, UnrecognizedLocationTypeException {
        LocationGroup locationGroup = locationGroupRepository.findById(locationGroupDto.getId()).get();
        if( locationGroup == null ) throw new UnrecognizedLocationTypeException();
        if( locationGroupDto.getName() == null || locationGroupDto.getName().equals("") ){
            throw new EmptyFieldException("Name field can not be empty");
        } else {
            locationGroup.setName(locationGroupDto.getName());
        }
        locationGroup.setDescription(locationGroupDto.getDescription());
        return  locationGroupRepository.save(locationGroup);
    }

}
