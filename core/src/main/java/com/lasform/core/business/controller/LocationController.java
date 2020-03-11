package com.lasform.core.business.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.http.ResponseEntity;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.business.exceptions.NativeQueryException;
import com.lasform.core.business.exceptions.UnrecognizedCityException;
import com.lasform.core.business.exceptions.UnrecognizedLocationException;
import com.lasform.core.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.core.business.service.implementation.LocationGroupServiceImp;
import com.lasform.core.business.service.implementation.LocationServiceImp;
import com.lasform.core.business.service.implementation.LocationTypeServiceImp;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.LocationBoundary;
import com.lasform.core.model.dto.LocationDto;
import com.lasform.core.model.dto.LocationGroupDto;
import com.lasform.core.model.dto.LocationTypeDto;
import com.lasform.core.model.dto.RadiusSearchDto;
import com.lasform.core.model.entity.Location;
import com.lasform.core.model.entity.LocationGroup;
import com.lasform.core.model.entity.LocationType;

import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;

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

	@GetMapping(value = "/echo")
	private String echo(@RequestParam String message) {
		return message;
	}

	@GetMapping(value = "/getById/{locationId}")
	@ApiOperation(value = "Get the location using the Location ID")
	private ResponseEntity<Location> findLocationById(
			@ApiParam(value = "Location ID", required = true) @PathVariable Long locationId) {
		return ResponseHelper.prepareSuccess(locationService.findById(locationId));
	}

	@GetMapping(value = "/getByName/{locationName}")
	@ApiOperation(value = "Get the location using the Location Name")
	private ResponseEntity<Location> findLocationByName(
			@ApiParam(value = "Location Name", required = true) @PathVariable String locationName) {
		return ResponseHelper.prepareSuccess(locationService.findByName(locationName));
	}

	@PostMapping(value = "/search")
	@ApiOperation(value = "Search locations using the Location DTO object")
	private ResponseEntity<List<Location>> searchLocations(
			@ApiParam(value = "Location Search Object", required = true) @RequestBody LocationDto locationDto) {
		return ResponseHelper.prepareSuccess(locationService.search(locationDto));
	}

	@GetMapping(value = "/searchByName/{locationName}")
	@ApiOperation(value = "Search locations using the Location Name")
	private ResponseEntity<List<Location>> searchLocationsByName(
			@ApiParam(value = "Location Name", required = true) @PathVariable String locationName) {
		return ResponseHelper.prepareSuccess(locationService.searchByName(locationName));
	}

	@GetMapping(value = "/getInCity/{cityId}")
	@ApiOperation(value = "Get locations that are registered under given City ID")
	private ResponseEntity<List<Location>> getLocationsInCity(
			@ApiParam(value = "Location ID", required = true) @PathVariable Long cityId) {
		return ResponseHelper.prepareSuccess(locationService.getLocationsInCity(cityId));
	}

	@GetMapping(value = "/getInState/{stateId}")
	@ApiOperation(value = "Get locations that are registered under given State ID")
	private ResponseEntity<List<Location>> getLocationsInState(
			@ApiParam(value = "State ID", required = true) @PathVariable Long stateId) {
		return ResponseHelper.prepareSuccess(locationService.getLocationsInState(stateId));
	}

	@GetMapping(value = "/getInCountry/{countryId}")
	@ApiOperation(value = "Get locations that are registered under given Country ID")
	private ResponseEntity<List<Location>> getLocationsInCountry(
			@ApiParam(value = "Country ID", required = true) @PathVariable Long countryId) {
		return ResponseHelper.prepareSuccess(locationService.getLocationsInCountry(countryId));
	}

	@PostMapping(value = "/getInBoundary")
	@ApiOperation(value = "Get locations that are registered in the given boundary")
	private ResponseEntity<List<Location>> getLocationsInBoundary(
			@ApiParam(value = "Location Boundary Object", required = true) @RequestBody LocationBoundary locationBoundary) {
		return ResponseHelper.prepareSuccess(locationService.getLocationsInBoundary(locationBoundary));
	}

	@PostMapping(value = "/getInBoundaryCount")
	@ApiOperation(value = "Get locations' count that are registered in the given boundary")
	private ResponseEntity<Long> getLocationsCountInBoundary(
			@ApiParam(value = "Location Boundary Object", required = true) @RequestBody LocationBoundary locationBoundary) {
		return ResponseHelper.prepareSuccess(locationService.getLocationsCountInBoundary(locationBoundary));
	}

	@PostMapping(value = "/getInRadius")
	@ApiOperation(value = "Get locations  that are registered in the given radius")
	private ResponseEntity<List<Location>> getLocationsInRadius(
			@ApiParam(value = "Radius Search Object", required = true) @RequestBody RadiusSearchDto radiusSearchDto)
			throws NativeQueryException {
		return ResponseHelper.prepareSuccess(locationService.getLocationsInRadius(radiusSearchDto));
	}

	@PostMapping(value = "/add")
	@ApiOperation(value = "Add a location using data from Location DTO")
	private ResponseEntity<Location> addLocation(
			@ApiParam(value = "Location Add Object", required = true) @RequestBody LocationDto locationDto)
			throws UnrecognizedCityException, UnrecognizedLocationTypeException {
		return ResponseHelper.prepareSuccess(locationService.save(locationDto));
	}

	@PostMapping(value = "/add/bulk")
	@ApiOperation(value = "Add a locations using data from list of Location DTOs")
	private ResponseEntity<List<Location>> addBulkLocations(
			@ApiParam(value = "Location Add Objects", required = true) @RequestBody List<LocationDto> locationDtos)
			throws UnrecognizedCityException, UnrecognizedLocationTypeException {
		return ResponseHelper.prepareSuccess(locationService.saveAll(locationDtos));
	}

	@PostMapping(value = "/jms/add")
	@ApiOperation(value = "Add a location using data from Location DTO by JMS")
	private ResponseEntity<Void> addLocationMessage(
			@ApiParam(value = "Location Add Object", required = true) @RequestBody LocationDto locationDto) {
		jmsTemplate.convertAndSend("addLocationQueue", locationDto);
		return ResponseHelper.prepareSuccess();
	}

	@PostMapping(value = "/jms/add/bulk")
	@ApiOperation(value = "Add a locations using data from list of Location DTOs by JMS")
	private ResponseEntity<Void> addBulkLocationMessage(
			@ApiParam(value = "Location Add Objects", required = true) @RequestBody List<LocationDto> locationDtos) {
		jmsTemplate.convertAndSend("addBulkLocationQueue", locationDtos);
		return ResponseHelper.prepareSuccess();
	}

	@PutMapping(value = "/update")
	@ApiOperation(value = "Update location using data from Location DTO")
	private ResponseEntity<Location> updateLocation(
			@ApiParam(value = "Location Update Objects", required = true) @RequestBody LocationDto locationDto)
			throws UnrecognizedLocationTypeException, UnrecognizedLocationException, UnrecognizedCityException {
		return ResponseHelper.prepareSuccess(locationService.update(locationDto));
	}

	@GetMapping(value = "/type/get/{locationTypeId}")
	@ApiOperation(value = "Get the location types by LocationType ID")
	private ResponseEntity<LocationType> getLocationType(
			@ApiParam(value = "LocationType ID", required = true) @PathVariable Long locationTypeId) {
		return null;
	}

	@GetMapping(value = "/type/getList")
	@ApiOperation(value = "Get the location types list")
	private ResponseEntity<List<LocationType>> getLocationTypeList() {
		return ResponseHelper.prepareSuccess(locationTypeService.getLocationTypeList());
	}

	@PostMapping(value = "/type/add")
	@ApiOperation(value = "Add new Location Type")
	private ResponseEntity<LocationType> addLocationType(
			@ApiParam(value = "LocationType Add Object", required = true) @RequestBody LocationTypeDto locationTypeDto)
			throws EmptyFieldException {
		return ResponseHelper.prepareSuccess(locationTypeService.save(locationTypeDto));
	}

	@PutMapping(value = "/type/update")
	@ApiOperation(value = "Update Location Type")
	private ResponseEntity<LocationType> updateLocationType(
			@ApiParam(value = "LocationType Update Object", required = true) @RequestBody LocationTypeDto locationTypeDto)
			throws EmptyFieldException, UnrecognizedLocationTypeException {
		return ResponseHelper.prepareSuccess(locationTypeService.update(locationTypeDto));
	}

	@GetMapping(value = "/type/get/{locationGroupId}")
	@ApiOperation(value = "Get the location types by LocationType ID")
	private ResponseEntity<LocationType> getLocationGroup(
			@ApiParam(value = "LocationGroup ID", required = true) @PathVariable Long locationGroupId) {
		return null;
	}

	@PostMapping(value = "/group/groupList")
	@ApiOperation(value = "Get the Location Groups list")
	private ResponseEntity<List<LocationGroup>> getLocationGroupList() {
		return ResponseHelper.prepareSuccess(locationGroupService.getLocationGroupList());
	}

	@PostMapping(value = "/group/add")
	@ApiOperation(value = "Add new Location Group")
	private ResponseEntity<LocationGroup> addLocationGroup(
			@ApiParam(value = "LocationGroup Add Object", required = true) @RequestBody LocationGroupDto locationGroupDto)
			throws EmptyFieldException {
		return ResponseHelper.prepareSuccess(locationGroupService.save(locationGroupDto));
	}

	@PutMapping(value = "/group/update")
	@ApiOperation(value = "Update Location Group")
	private ResponseEntity<LocationGroup> updateLocationGroup(
			@ApiParam(value = "LocationGroup Update Object", required = true) @RequestBody LocationGroupDto locationGroupDto)
			throws EmptyFieldException, UnrecognizedLocationTypeException {
		return ResponseHelper.prepareSuccess(locationGroupService.update(locationGroupDto));
	}

}
