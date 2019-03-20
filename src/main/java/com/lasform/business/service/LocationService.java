package com.lasform.business.service;

import com.lasform.business.exceptions.UnrecognizedCityException;
import com.lasform.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.business.repository.CityRepository;
import com.lasform.business.repository.LocationRepository;
import com.lasform.model.dto.DirectionRequest;
import com.lasform.model.dto.LocationBoundary;
import com.lasform.model.dto.LocationDto;
import com.lasform.model.entity.Location;
import com.lasform.model.entity.City;
import com.lasform.model.entity.LocationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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

    public Location save( LocationDto locationDto ) throws UnrecognizedCityException, UnrecognizedLocationTypeException {
        City city = cityRepository.findById(locationDto.getCityId()).get();
        LocationType locationType = new LocationType();
        Location location = new Location();
        location.setName(locationDto.getName());
        location.setLatitude(locationDto.getLatitude());
        location.setLongitude(locationDto.getLongitude());
        location.setAddress(locationDto.getAddress());
        if( city != null ) location.setCity(city); else throw new UnrecognizedCityException();
        if( locationType != null ) location.setLocationType(locationType); else throw new UnrecognizedLocationTypeException();
        return locationRepository.save(location);
    }

    public List<Location> getLocationsInBoundary(LocationBoundary locationBoundary){
        return locationRepository.getLocationsInBoundary( locationBoundary.getNortheast().getLatitude() ,
                locationBoundary.getNortheast().getLongitude() ,
                locationBoundary.getSouthwest().getLatitude() ,
                locationBoundary.getSouthwest().getLongitude() );
    }

    public long getLocationsCountInBoundary(LocationBoundary locationBoundary){
        return locationRepository.getLocationsCountInBoundary( locationBoundary.getNortheast().getLatitude() ,
                locationBoundary.getNortheast().getLongitude() ,
                locationBoundary.getSouthwest().getLatitude() ,
                locationBoundary.getSouthwest().getLongitude() );
    }

}
