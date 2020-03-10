package com.lasform.core.business.controller;

import com.lasform.core.business.exceptions.*;
import com.lasform.core.business.service.implementation.LocationGroupServiceImp;
import com.lasform.core.business.service.implementation.LocationServiceImp;
import com.lasform.core.business.service.implementation.LocationTypeServiceImp;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.*;
import com.lasform.core.model.entity.Location;
import com.lasform.core.model.entity.LocationGroup;
import com.lasform.core.model.entity.LocationType;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.http.ResponseEntity;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

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

    @Autowired
    MessageSource messageSource;

    @GetMapping(value="/echo")
    private String echo(@RequestParam String  message){
        return message;
    }

    @GetMapping(value="/echoLocale")
    private String echoLocale(@RequestHeader(name="Accept-Language",required = false) Locale locale){
        return messageSource.getMessage("test.message.hello",null,locale);
    }

    @GetMapping(value="/getById/{locationId}")
    private ResponseEntity<Location> findLocationById( @PathVariable Long locationId ){
        return ResponseHelper.prepareSuccess( locationService.findById( locationId ) );
    }

    @GetMapping(value="/getByName/{locationName}")
    private ResponseEntity<Location> findLocationByName( @PathVariable String locationName ){
        return ResponseHelper.prepareSuccess( locationService.findByName( locationName ) );
    }

    @PostMapping(value="/search")
    private ResponseEntity<List<Location>> searchLocations(@RequestBody LocationDto locationDto){
        return ResponseHelper.prepareSuccess( locationService.search( locationDto ) );
    }

    @GetMapping(value="/searchByName/{locationName}")
    private ResponseEntity<List<Location>> searchLocationsByName( @PathVariable String locationName ){
        return ResponseHelper.prepareSuccess( locationService.searchByName( locationName ) );
    }

    @GetMapping(value="/getInCity/{cityId}")
    private ResponseEntity<List<Location>> getLocationsInCity( @PathVariable Long cityId ){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInCity( cityId ) );
    }

    @GetMapping(value="/getInState/{stateId}")
    private ResponseEntity<List<Location>> getLocationsInState( @PathVariable Long stateId ){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInState( stateId ) );
    }

    @GetMapping(value="/getInCountry/{countryId}")
    private ResponseEntity<List<Location>> getLocationsInCountry( @PathVariable Long countryId ){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInCountry( countryId ) );
    }

    @PostMapping(value="/getInBoundary")
    private ResponseEntity<List<Location>> getLocationsInBoundary( @RequestBody LocationBoundary locationBoundary ){
        return ResponseHelper.prepareSuccess( locationService.getLocationsInBoundary(locationBoundary) );
    }

    @PostMapping(value="/getInBoundaryCount")
    private ResponseEntity<Long> getLocationsCountInBoundary( @RequestBody LocationBoundary locationBoundary ){
        return ResponseHelper.prepareSuccess( locationService.getLocationsCountInBoundary(locationBoundary) );
    }

    @PostMapping(value="/getInRadius")
    private ResponseEntity<List<Location>> getLocationsInRadius(@RequestBody RadiusSearchDto radiusSearchDto) throws NativeQueryException {
        return ResponseHelper.prepareSuccess( locationService.getLocationsInRadius(radiusSearchDto) );
    }

    @PostMapping(value="/add")
    private ResponseEntity<Location> addLocation(@RequestBody LocationDto locationDto) throws UnrecognizedCityException, UnrecognizedLocationTypeException {
        return ResponseHelper.prepareSuccess( locationService.save(locationDto) );
    }

    @PostMapping(value="/add/bulk")
    private ResponseEntity<List<Location>> addBulkLocations(@RequestBody List<LocationDto> locationDtos) throws UnrecognizedCityException, UnrecognizedLocationTypeException {
        return ResponseHelper.prepareSuccess( locationService.saveAll(locationDtos) );
    }
    
    @PostMapping(value="/jms/add")
    private ResponseEntity<Void> addLocationMessage(@RequestBody LocationDto locationDto){
        jmsTemplate.convertAndSend("addLocationQueue", locationDto);
        return ResponseHelper.prepareSuccess();
    }
    
    @PostMapping(value="/jms/add/bulk")
    private ResponseEntity<Void> addBulkLocationMessage(@RequestBody List<LocationDto> locationDtos){
        jmsTemplate.convertAndSend("addBulkLocationQueue", locationDtos);
        return ResponseHelper.prepareSuccess();
    }


    @PutMapping(value="/update")
    private ResponseEntity<Location> updateLocation(@RequestBody LocationDto locationDto) throws UnrecognizedLocationTypeException, UnrecognizedLocationException, UnrecognizedCityException {
        return ResponseHelper.prepareSuccess( locationService.update(locationDto) );
    }

    @GetMapping(value="/type/getList")
    private ResponseEntity<List<LocationType>> getLocationTypeList(){
        return ResponseHelper.prepareSuccess( locationTypeService.getLocationTypeList() );
    }

    @PostMapping(value="/type/add")
    private ResponseEntity<LocationType> addLocationType(@RequestBody LocationTypeDto locationTypeDto) throws EmptyFieldException {
        return ResponseHelper.prepareSuccess( locationTypeService.save(locationTypeDto) );
    }

    @PutMapping(value="/type/update")
    private ResponseEntity<LocationType> updateLocationType(@RequestBody LocationTypeDto locationTypeDto) throws EmptyFieldException, UnrecognizedLocationTypeException {
        return ResponseHelper.prepareSuccess( locationTypeService.update(locationTypeDto) );
    }

    @PostMapping(value="/group/groupList")
    private ResponseEntity<List<LocationGroup>> getLocationGroupList(){
        return ResponseHelper.prepareSuccess( locationGroupService.getLocationGroupList() );
    }

    @PostMapping(value="/group/add")
    private ResponseEntity<LocationGroup> addLocationGroup(@RequestBody LocationGroupDto locationGroupDto) throws EmptyFieldException {
        return ResponseHelper.prepareSuccess( locationGroupService.save(locationGroupDto) );
    }

    @PutMapping(value="/group/update")
    private ResponseEntity<LocationGroup> updateLocationGroup(@RequestBody LocationGroupDto locationGroupDto) throws EmptyFieldException, UnrecognizedLocationTypeException {
        return ResponseHelper.prepareSuccess( locationGroupService.update(locationGroupDto) );
    }




}
