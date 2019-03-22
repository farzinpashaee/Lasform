package com.lasform.business.controller;

import com.lasform.business.exceptions.*;
import com.lasform.business.service.LocationService;
import com.lasform.business.service.LocationTypeService;
import com.lasform.helper.ResponseHelper;
import com.lasform.model.dto.*;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/location")
@EnableWebSecurity
@Api(value="Location REST API", description="REST API for location base services")
public class LocationController {

    @Autowired
    LocationService locationService;

    @Autowired
    LocationTypeService locationTypeService;

    @RequestMapping(value="/echo", method = RequestMethod.POST)
    private String echo(@RequestBody String  message){
        return message;
    }

    @PostMapping(value="/findLocationById")
    private Response findLocationById(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.findById(locationDto.getId()) );
    }

    @PostMapping(value="/searchLocationByName")
    private Response searchLocationByName(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.searchByName( locationDto.getName() ) );
    }

    @PostMapping(value = "/getLocationsInBoundary")
    private Response getLocationsInBoundary(@RequestBody LocationBoundary locationBoundary){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInBoundary(locationBoundary) );
    }

    @PostMapping(value = "/getLocationsCountInBoundary")
    private Response getLocationsCountInBoundary(@RequestBody LocationBoundary locationBoundary){
        return ResponseHelper.prepareSuccess( locationService.getLocationsCountInBoundary(locationBoundary) );
    }

    @PostMapping(value = "/getLocationsInRadius")
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

    @PostMapping(value="/updateLocation")
    private Response updateLocation(@RequestBody LocationDto locationDto){
        try{
            return ResponseHelper.prepareSuccess( locationService.update(locationDto) );
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/getLocationTypeList")
    private Response getLocationTypeList(@RequestBody LocationTypeDto locationTypeDto){
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

}
