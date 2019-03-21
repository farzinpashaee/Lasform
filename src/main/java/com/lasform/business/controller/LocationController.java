package com.lasform.business.controller;

import com.lasform.business.exceptions.NativeQueryException;
import com.lasform.business.exceptions.UnrecognizedCityException;
import com.lasform.business.exceptions.UnrecognizedLocationException;
import com.lasform.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.business.service.ApplicationService;
import com.lasform.business.service.LocationService;
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


    @PostMapping(value="/saveLocation")
    private Response saveLocation(@RequestBody LocationDto locationDto){
        try {
            return ResponseHelper.prepareSuccess( locationService.save(locationDto) );
        } catch (UnrecognizedCityException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        } catch (UnrecognizedLocationTypeException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/updateLocation")
    private Response updateLocation(@RequestBody LocationDto locationDto){
        try{
            return ResponseHelper.prepareSuccess( locationService.update(locationDto) );
        } catch (UnrecognizedCityException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        } catch (UnrecognizedLocationTypeException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        } catch (UnrecognizedLocationException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }





}
