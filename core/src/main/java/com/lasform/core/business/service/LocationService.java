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
import com.lasform.core.model.entity.Location;
import com.lasform.core.model.entity.City;
import com.lasform.core.model.entity.LocationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class LocationService {

    @Autowired
    LocationRepository locationRepository;

    @Autowired
    LocationTypeRepository locationTypeRepository;

    @Autowired
    CityRepository cityRepository;

    @Value("${spring.datasource.driverClassName}")
    String datasourceDriver;

    public Location findById( long id ){
        return locationRepository.findById(id).get() ;
    }

    public Location findByName( String name ){ return locationRepository.findByName(name); }

    public List<Location> search( LocationDto locationDto ){
        LocationSearchSpecifications locationSearchSpecifications = new LocationSearchSpecifications(locationDto);
        return locationRepository.findAll(locationSearchSpecifications);
    }

    public List<Location> searchByName( String nameQuery ){
        return locationRepository.searchByName( nameQuery );
    }

    public Location save( LocationDto locationDto ) throws UnrecognizedCityException, UnrecognizedLocationTypeException {
        Location location = new Location();
        City city = cityRepository.findById(locationDto.getCityId()).get();
        if( city != null ) location.setCity(city); else throw new UnrecognizedCityException();
        LocationType locationType = locationTypeRepository.findById(locationDto.getLocationTypeId()).get();
        if( locationType != null ) location.setLocationType(locationType); else throw new UnrecognizedLocationTypeException();
        location.setName(locationDto.getName());
        location.setLatitude(locationDto.getLatitude());
        location.setLongitude(locationDto.getLongitude());
        location.setAddress(locationDto.getAddress());
        return locationRepository.save(location);
    }

    public ArrayList<Location> saveAll( List<LocationDto> locationDtos ) throws UnrecognizedCityException, UnrecognizedLocationTypeException {
        ArrayList<Location> locations = new ArrayList<Location>();
        for( LocationDto locationDto : locationDtos ){
            Location location = new Location();
            City city = cityRepository.findById(locationDto.getCityId()).get();
            if( city != null ) location.setCity(city); else throw new UnrecognizedCityException();
            LocationType locationType = locationTypeRepository.findById(locationDto.getLocationTypeId()).get();
            if( locationType != null ) location.setLocationType(locationType); else throw new UnrecognizedLocationTypeException();
            location.setName(locationDto.getName());
            location.setLatitude(locationDto.getLatitude());
            location.setLongitude(locationDto.getLongitude());
            location.setAddress(locationDto.getAddress());
            locations.add(location);
        }
        locationRepository.saveAll(locations);
        return locations;
    }

    public Location update( LocationDto locationDto ) throws UnrecognizedCityException, UnrecognizedLocationException, UnrecognizedLocationTypeException {
        Location location = locationRepository.findById(locationDto.getId()).get();
        if( location == null ) throw new UnrecognizedLocationException();
        City city = cityRepository.findById(locationDto.getCityId()).get();
        if( city != null ) location.setCity(city); else throw new UnrecognizedCityException();
        LocationType locationType = locationTypeRepository.findById(locationDto.getLocationTypeId()).get();
        if( locationType != null ) location.setLocationType(locationType); else throw new UnrecognizedLocationTypeException();
        location.setName(locationDto.getName());
        location.setLatitude(locationDto.getLatitude());
        location.setLongitude(locationDto.getLongitude());
        location.setAddress(locationDto.getAddress());
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

    public List<Location> getLocationsInRadius(RadiusSearchDto radiusSearchDto) throws NativeQueryException {
        if( datasourceDriver.equals(C.DB_DRIVERS.MYSQL) ){
            return locationRepository.getLocationsInRadius(radiusSearchDto.getCenter().getLatitude() ,
                    radiusSearchDto.getCenter().getLongitude(),
                    radiusSearchDto.getRadius());
        } else {
            throw new NativeQueryException("Native query not provided for this service");
        }
    }

    public List<Location> getLocationsInCity( Long cityId ){
        return locationRepository.findAllByCityId( cityId );
    }

    public List<Location> getLocationsInState( Long stateId ){
        return locationRepository.findAllByCity_StateId( stateId );
    }

    public List<Location> getLocationsInCountry( Long countryId ){
        return locationRepository.findAllByCity_State_CountryId( countryId );
    }

}
