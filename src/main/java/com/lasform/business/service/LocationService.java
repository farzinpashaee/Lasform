package com.lasform.business.service;

import com.lasform.business.repository.CityRepository;
import com.lasform.business.repository.LocationRepository;
import com.lasform.model.dto.LocationBoundary;
import com.lasform.model.dto.LocationDto;
import com.lasform.model.entity.Location;
import com.lasform.model.entity.City;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationService {

    @Autowired
    LocationRepository locationRepository;

    @Autowired
    CityRepository cityRepository;

    public Location findById( long id ){
        return locationRepository.findById(id).get() ;
    }

    public List<Location> searchByName( String nameQuery ){
        return locationRepository.searchByName( nameQuery );
    }

    public Location save( LocationDto locationDto ){
        City city = cityRepository.findById( locationDto.getCityId() ).get();
        return locationRepository.save(locationDto.getLocation( city ,null));
    }

    public List<Location> getLocationsInBoundary(LocationBoundary locationBoundary){
        return locationRepository.getLocationsInBoundary( locationBoundary.getNortheast().getLatitude() ,
                                                            locationBoundary.getNortheast().getLongitude() ,
                                                            locationBoundary.getSouthwest().getLatitude() ,
                                                            locationBoundary.getSouthwest().getLongitude() );
    }

}
