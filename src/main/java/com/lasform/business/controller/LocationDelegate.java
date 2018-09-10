package com.lasform.business.controller;

import com.lasform.business.service.LocationService;
import com.lasform.helper.ResponseHelper;
import com.lasform.model.dto.LatLng;
import com.lasform.model.dto.LocationBoundary;
import com.lasform.model.dto.LocationDto;
import com.lasform.model.dto.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/location")
@EnableWebSecurity
public class LocationDelegate {

    @Autowired
    LocationService locationService;

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

    @RequestMapping(value="/findById")
    private Response findById(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.findById(locationDto.getId()) );
    }

    @RequestMapping(value="/searchByName")
    private Response searchByName(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.searchByName( locationDto.getName() ) );
    }

    @RequestMapping(value = "/getLocationsInBoundary")
    private Response getLocationsInBoundary(@RequestBody LocationBoundary locationBoundary){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInBoundary(locationBoundary) );
    }

    @RequestMapping(value = "/getLocationsCountInBoundary")
    private Response getLocationsCountInBoundary(@RequestBody LocationBoundary locationBoundary){
        return ResponseHelper.prepareSuccess( locationService.getLocationsCountInBoundary(locationBoundary) );
    }

    @RequestMapping(value="/save")
    private Response save(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.save(locationDto) );
    }

}
