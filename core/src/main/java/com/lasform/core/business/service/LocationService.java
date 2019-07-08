package com.lasform.core.business.service;

import com.lasform.core.C;
import com.lasform.core.business.exceptions.NativeQueryException;
import com.lasform.core.business.exceptions.UnrecognizedCityException;
import com.lasform.core.business.exceptions.UnrecognizedLocationException;
import com.lasform.core.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.core.business.repository.CityRepository;
import com.lasform.core.business.repository.LocationRepository;
import com.lasform.core.business.repository.LocationTypeRepository;
import com.lasform.core.business.specifications.LocationSearchSpecifications;
import com.lasform.core.model.dto.LocationBoundary;
import com.lasform.core.model.dto.LocationDto;
import com.lasform.core.model.dto.RadiusSearchDto;
import com.lasform.core.model.entity.City;
import com.lasform.core.model.entity.Location;
import com.lasform.core.model.entity.LocationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public interface LocationService {
    Location findById(long id );
    Location findByName( String name );
    List<Location> search(LocationDto locationDto );
    List<Location> searchByName( String nameQuery );
    Location save( LocationDto locationDto ) throws UnrecognizedCityException, UnrecognizedLocationTypeException;
    ArrayList<Location> saveAll(List<LocationDto> locationDtos ) throws UnrecognizedCityException, UnrecognizedLocationTypeException;
    Location update( LocationDto locationDto ) throws UnrecognizedCityException, UnrecognizedLocationException, UnrecognizedLocationTypeException;
    List<Location> getLocationsInBoundary(LocationBoundary locationBoundary);
    long getLocationsCountInBoundary(LocationBoundary locationBoundary);
    List<Location> getLocationsInRadius(RadiusSearchDto radiusSearchDto, Locale locale) throws NativeQueryException;
    List<Location> getLocationsInCity( Long cityId );
    List<Location> getLocationsInState( Long stateId );
    List<Location> getLocationsInCountry( Long countryId );
}
