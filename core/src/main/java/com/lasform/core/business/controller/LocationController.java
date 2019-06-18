package com.lasform.core.business.controller;

import com.lasform.core.business.exceptions.*;
import com.lasform.core.business.service.implementation.LocationGroupServiceImp;
import com.lasform.core.business.service.implementation.LocationServiceImp;
import com.lasform.core.business.service.implementation.LocationTypeServiceImp;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.*;
import com.lasform.core.model.entity.City;
import com.lasform.core.model.entity.Country;
import com.lasform.core.model.entity.State;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/location")
public class LocationController {

    @Autowired
    LocationServiceImp locationService;

    @Autowired
    LocationTypeServiceImp locationTypeService;

    @Autowired
    LocationGroupServiceImp locationGroupService;

    @Autowired
    JmsTemplate jmsTemplate;

    @RequestMapping(value="/echo")
    private String echo(@RequestParam String  message){
        return message;
    }

    @PostMapping(value="/findLocationById")
    private ResponseEntity findLocationById(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.findById(locationDto.getId()) );
    }

    @PostMapping(value="/findLocationByName")
    private ResponseEntity findLocationByName(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.findByName( locationDto.getName() ) );
    }

    @PostMapping(value="/searchLocations")
    private ResponseEntity searchLocations(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.search( locationDto ) );
    }

    @PostMapping(value="/searchLocationsByName")
    private ResponseEntity searchLocationsByName(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.searchByName( locationDto.getName() ) );
    }

    @PostMapping(value="/getLocationsInCity")
    private ResponseEntity getLocationsInCity(@RequestBody City city){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInCity( city.getId() ) );
    }

    @PostMapping(value="/getLocationsInState")
    private ResponseEntity getLocationsInState(@RequestBody State state){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInState( state.getId() ) );
    }

    @PostMapping(value="/getLocationsInCountry")
    private ResponseEntity getLocationsInCountry(@RequestBody Country country){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInCountry( country.getId() ) );
    }

    @PostMapping(value="/getLocationsInBoundary")
    private ResponseEntity getLocationsInBoundary(@RequestBody LocationBoundary locationBoundary){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInBoundary(locationBoundary) );
    }

    @PostMapping(value="/getLocationsCountInBoundary")
    private ResponseEntity getLocationsCountInBoundary(@RequestBody LocationBoundary locationBoundary){
        return ResponseHelper.prepareSuccess( locationService.getLocationsCountInBoundary(locationBoundary) );
    }

    @PostMapping(value="/getLocationsInRadius")
    private ResponseEntity getLocationsInRadius(@RequestBody RadiusSearchDto radiusSearchDto) throws NativeQueryException {
        return ResponseHelper.prepareSuccess( locationService.getLocationsInRadius(radiusSearchDto) );
    }

    @PostMapping(value="/addLocation")
    private ResponseEntity addLocation(@RequestBody LocationDto locationDto) throws UnrecognizedCityException, UnrecognizedLocationTypeException {
        return ResponseHelper.prepareSuccess( locationService.save(locationDto) );
    }

    @PostMapping(value="/addLocationMessage")
    private ResponseEntity addLocationMessage(@RequestBody LocationDto locationDto){
        jmsTemplate.convertAndSend("addLocationQueue", locationDto);
        return ResponseHelper.prepareSuccess("{}");
    }

    @PostMapping(value="/addBulkLocations")
    private ResponseEntity addBulkLocations(@RequestBody List<LocationDto> locationDtos) throws UnrecognizedCityException, UnrecognizedLocationTypeException {
        return ResponseHelper.prepareSuccess( locationService.saveAll(locationDtos) );
    }

    @PostMapping(value="/updateLocation")
    private ResponseEntity updateLocation(@RequestBody LocationDto locationDto) throws UnrecognizedLocationTypeException, UnrecognizedLocationException, UnrecognizedCityException {
        return ResponseHelper.prepareSuccess( locationService.update(locationDto) );
    }

    @PostMapping(value="/getLocationTypeList")
    private ResponseEntity getLocationTypeList(){
        return ResponseHelper.prepareSuccess( locationTypeService.getLocationTypeList() );
    }

    @PostMapping(value="/addLocationType")
    private ResponseEntity addLocationType(@RequestBody LocationTypeDto locationTypeDto) throws EmptyFieldException {
        return ResponseHelper.prepareSuccess( locationTypeService.save(locationTypeDto) );
    }

    @PostMapping(value="/updateLocationType")
    private ResponseEntity updateLocationType(@RequestBody LocationTypeDto locationTypeDto) throws EmptyFieldException, UnrecognizedLocationTypeException {
        return ResponseHelper.prepareSuccess( locationTypeService.update(locationTypeDto) );
    }

    @PostMapping(value="/getLocationGroupList")
    private ResponseEntity getLocationGroupList(){
        return ResponseHelper.prepareSuccess( locationGroupService.getLocationGroupList() );
    }

    @PostMapping(value="/addLocationGroup")
    private ResponseEntity addLocationGroup(@RequestBody LocationGroupDto locationGroupDto) throws EmptyFieldException {
        return ResponseHelper.prepareSuccess( locationGroupService.save(locationGroupDto) );
    }

    @PostMapping(value="/updateLocationGroup")
    private ResponseEntity updateLocationGroup(@RequestBody LocationGroupDto locationGroupDto) throws EmptyFieldException, UnrecognizedLocationTypeException {
        return ResponseHelper.prepareSuccess( locationGroupService.update(locationGroupDto) );
    }




}
