package com.lasform.core.business.controller;

import com.lasform.core.business.service.LocationGroupService;
import com.lasform.core.business.service.LocationService;
import com.lasform.core.business.service.LocationTypeService;
import com.lasform.core.business.exceptions.BusinessException;
import com.lasform.core.business.exceptions.NativeQueryException;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.*;
import com.lasform.core.model.entity.City;
import com.lasform.core.model.entity.Country;
import com.lasform.core.model.entity.State;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/location")
@EnableWebSecurity
public class LocationController {

    @Autowired
    LocationService locationService;

    @Autowired
    LocationTypeService locationTypeService;

    @Autowired
    LocationGroupService locationGroupService;

    @RequestMapping(value="/echo")
    private String echo(@RequestParam String  message){
        return message;
    }

    @PostMapping(value="/findLocationById")
    private Response findLocationById(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.findById(locationDto.getId()) );
    }

    @PostMapping(value="/findLocationByName")
    private Response findLocationByName(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.findByName( locationDto.getName() ) );
    }

    @PostMapping(value="/searchLocations")
    private Response searchLocations(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.search( locationDto ) );
    }

    @PostMapping(value="/searchLocationsByName")
    private Response searchLocationsByName(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.searchByName( locationDto.getName() ) );
    }

    @PostMapping(value="/getLocationsInCity")
    private Response getLocationsInCity(@RequestBody City city){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInCity( city.getId() ) );
    }

    @PostMapping(value="/getLocationsInState")
    private Response getLocationsInState(@RequestBody State state){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInState( state.getId() ) );
    }

    @PostMapping(value="/getLocationsInCountry")
    private Response getLocationsInCountry(@RequestBody Country country){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInCountry( country.getId() ) );
    }

    @PostMapping(value="/getLocationsInBoundary")
    private Response getLocationsInBoundary(@RequestBody LocationBoundary locationBoundary){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInBoundary(locationBoundary) );
    }

    @PostMapping(value="/getLocationsCountInBoundary")
    private Response getLocationsCountInBoundary(@RequestBody LocationBoundary locationBoundary){
        return ResponseHelper.prepareSuccess( locationService.getLocationsCountInBoundary(locationBoundary) );
    }

    @PostMapping(value="/getLocationsInRadius")
    private Response getLocationsInRadius(@RequestBody RadiusSearchDto radiusSearchDto){
        try {
            return ResponseHelper.prepareSuccess( locationService.getLocationsInRadius(radiusSearchDto) );
        } catch (NativeQueryException e) {
            return ResponseHelper.prepareError( 0 , e.getMessage() );
        }
    }

    @PostMapping(value="/addLocation")
    private Response addLocation(@RequestBody LocationDto locationDto){
        try {
            return ResponseHelper.prepareSuccess( locationService.save(locationDto) );
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/addBulkLocations")
    private Response addBulkLocations(@RequestBody List<LocationDto> locationDtos){
        try {
            return ResponseHelper.prepareSuccess( locationService.saveAll(locationDtos) );
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/updateLocation")
    private Response updateLocation(@RequestBody LocationDto locationDto){
        try{
            return ResponseHelper.prepareSuccess( locationService.update(locationDto) );
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/getLocationTypeList")
    private Response getLocationTypeList(){
        return ResponseHelper.prepareSuccess( locationTypeService.getLocationTypeList() );
    }

    @PostMapping(value="/addLocationType")
    private Response addLocationType(@RequestBody LocationTypeDto locationTypeDto){
        try {
            return ResponseHelper.prepareSuccess( locationTypeService.save(locationTypeDto) );
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/updateLocationType")
    private Response updateLocationType(@RequestBody LocationTypeDto locationTypeDto){
        try {
            return ResponseHelper.prepareSuccess( locationTypeService.update(locationTypeDto) );
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/getLocationGroupList")
    private Response getLocationGroupList(){
        return ResponseHelper.prepareSuccess( locationGroupService.getLocationGroupList() );
    }

    @PostMapping(value="/addLocationGroup")
    private Response addLocationGroup(@RequestBody LocationGroupDto locationGroupDto){
        try {
            return ResponseHelper.prepareSuccess( locationGroupService.save(locationGroupDto) );
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/updateLocationGroup")
    private Response updateLocationGroup(@RequestBody LocationGroupDto locationGroupDto){
        try {
            return ResponseHelper.prepareSuccess( locationGroupService.update(locationGroupDto) );
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }




}
