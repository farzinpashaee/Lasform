package com.lasform.core.business.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.business.service.implementation.GeoAreaServiceImp;
import com.lasform.core.business.service.implementation.GeoFenceServiceImp;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.GeoAreaDto;
import com.lasform.core.model.dto.GeoFenceDto;
import com.lasform.core.model.entity.GeoArea;
import com.lasform.core.model.entity.GeoFence;

@RestController
@RequestMapping("/api/geoArea")
// @EnableWebSecurity
public class GeoAreaController {

	@Autowired
	GeoAreaServiceImp geoAreaService;

	@Autowired
	GeoFenceServiceImp geoFenceService;

	@GetMapping(value = "/getById/{geoAreaId}")
	private ResponseEntity<GeoArea> find(@RequestBody Long geoAreaId) {
		return ResponseHelper.prepareSuccess(geoAreaService.findById(geoAreaId));
	}

	@GetMapping(value = "/getByName/{geoAreaName}")
	private ResponseEntity<GeoArea> findByName(@RequestBody String geoAreaName) {
		return ResponseHelper.prepareSuccess(geoAreaService.findByName(geoAreaName));
	}

	@PostMapping(value = "/search")
	private ResponseEntity<List<GeoArea>> search(@RequestBody GeoAreaDto geoAreaDto) {
		return ResponseHelper.prepareSuccess(geoAreaService.search(geoAreaDto));
	}

	@PostMapping(value = "/addByList")
	private ResponseEntity<GeoArea> addGeoAreaByList(@RequestBody GeoAreaDto geoAreaDto) throws EmptyFieldException {
		return ResponseHelper.prepareSuccess(geoAreaService.saveByList(geoAreaDto));
	}

	@GetMapping(value = "/fence/getById/{geoFenceId}")
	private ResponseEntity<GeoFence> findGeoFenceById(@RequestBody Long geoFenceId) {
		return ResponseHelper.prepareSuccess(geoFenceService.findById(geoFenceId));
	}

	@GetMapping(value = "/fence/getByName/{geoFenceByName}")
	private ResponseEntity<GeoFence> findGeoFenceByName(@RequestBody String geoFenceByName) {
		return ResponseHelper.prepareSuccess(geoFenceService.findByName(geoFenceByName));
	}

	@PostMapping(value = "/fence/search")
	private ResponseEntity<List<GeoFence>> searchGeoFence(@RequestBody GeoFenceDto geoFenceDto) {
		return ResponseHelper.prepareSuccess(geoFenceService.search(geoFenceDto));
	}

	@PostMapping(value = "/fence/add")
	private ResponseEntity<GeoFence> addGeoFenceByList(@RequestBody GeoFenceDto geoFenceDto)
			throws EmptyFieldException {
		return ResponseHelper.prepareSuccess(geoFenceService.saveByList(geoFenceDto));
	}

}
