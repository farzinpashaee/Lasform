package com.lasform.business.controller;

import com.lasform.business.service.LocationService;
import com.lasform.helper.ResponseHelper;
import com.lasform.model.dto.LocationBoundary;
import com.lasform.model.dto.LocationDto;
import com.lasform.model.dto.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/location")
public class LocationDelegate {

    @Autowired
    LocationService locationService;

    @RequestMapping(value="/echo", method = RequestMethod.POST)
    private String echo(@RequestParam String  message){
        return message;
    }

    @RequestMapping(value="/findById")
    private Response findById(@RequestParam LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.findById(locationDto.getId()) );
    }

    @RequestMapping(value="/searchByName")
    private Response searchByName(@RequestParam LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.searchByName( locationDto.getName() ) );
    }

    @RequestMapping(value = "/getLocationsInBoundary")
    private Response getLocationsInBoundary(@RequestParam LocationBoundary locationBoundary){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInBoundary(locationBoundary) );
    }

    @RequestMapping(value="/save")
    private Response save(@RequestParam LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.save(locationDto) );
    }

}
