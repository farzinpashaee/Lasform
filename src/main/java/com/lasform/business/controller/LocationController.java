package com.lasform.business.controller;

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

    @Autowired
    ApplicationService applicationService;

    @RequestMapping(value="/test", method = RequestMethod.POST)
    private LocationBoundary test(){
        LocationBoundary lb = new LocationBoundary();
        lb.setNortheast(new LatLng("1","2"));
        lb.setSouthwest(new LatLng("1","2"));
        return lb;
    }

    @RequestMapping(value="/echo", method = RequestMethod.POST)
    private String echo(@RequestBody String  message){
        return message;
    }

    @PostMapping(value="/findById")
    private Response findById(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.findById(locationDto.getId()) );
    }

    @PostMapping(value="/searchByName")
    private Response searchByName(@RequestBody LocationDto locationDto){
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

    @PostMapping(value="/save")
    private Response save(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.save(locationDto) );
    }

    @GetMapping(value="/initialSetting")
    private Response initialSetting(){
        return ResponseHelper.prepareSuccess( applicationService.getInitialSetting() );
    }



}
