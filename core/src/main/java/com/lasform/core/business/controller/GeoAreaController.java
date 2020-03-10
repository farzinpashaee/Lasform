package com.lasform.core.business.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lasform.core.business.exceptions.BusinessException;
import com.lasform.core.business.service.implementation.GeoAreaServiceImp;
import com.lasform.core.business.service.implementation.GeoFenceServiceImp;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.GeoAreaDto;
import com.lasform.core.model.dto.GeoFenceDto;
import com.lasform.core.model.dto.ResponseErrorPayload;

@RestController
@RequestMapping("/api/geoArea")
// @EnableWebSecurity
public class GeoAreaController {

	@Autowired
	GeoAreaServiceImp geoAreaService;

	@Autowired
	GeoFenceServiceImp geoFenceService;

	@PostMapping(value = "/find")
	private ResponseEntity find(@RequestBody GeoAreaDto geoAreaDto) {
		return ResponseHelper.prepareSuccess(geoAreaService.findById(geoAreaDto.getId()));
	}

	@PostMapping(value = "/findById")
	private ResponseEntity findById(@RequestBody GeoAreaDto geoAreaDto) {
		return ResponseHelper.prepareSuccess(geoAreaService.findById(geoAreaDto.getId()));
	}

	@PostMapping(value = "/findByName")
	private ResponseEntity findByName(@RequestBody GeoAreaDto geoAreaDto) {
		return ResponseHelper.prepareSuccess(geoAreaService.findByName(geoAreaDto.getName()));
	}

	@PostMapping(value = "/search")
	private ResponseEntity search(@RequestBody GeoAreaDto geoAreaDto) {
		return ResponseHelper.prepareSuccess(geoAreaService.search(geoAreaDto));
	}

	@PostMapping(value = "/addGeoAreaByList")
	private ResponseEntity addGeoAreaByList(@RequestBody GeoAreaDto geoAreaDto) {
		try {
			return ResponseHelper.prepareSuccess(geoAreaService.saveByList(geoAreaDto));
		} catch (BusinessException e) {
			return ResponseHelper.prepareError(HttpStatus.INTERNAL_SERVER_ERROR.value(),
					new ResponseErrorPayload(e.getBusinessExceptionCode(), e.getMessage()));
		}
	}

	@PostMapping(value = "/findGeoFenceById")
	private ResponseEntity findGeoFenceById(@RequestBody GeoFenceDto geoFenceDto) {
		return ResponseHelper.prepareSuccess(geoFenceService.findById(geoFenceDto.getId()));
	}

	@PostMapping(value = "/findGeoFenceByName")
	private ResponseEntity findGeoFenceByName(@RequestBody GeoFenceDto geoFenceDto) {
		return ResponseHelper.prepareSuccess(geoFenceService.findByName(geoFenceDto.getName()));
	}

	@PostMapping(value = "/searchGeoFence")
	private ResponseEntity searchGeoFence(@RequestBody GeoFenceDto geoFenceDto) {
		return ResponseHelper.prepareSuccess(geoFenceService.search(geoFenceDto));
	}

	@PostMapping(value = "/addGeoFence")
	private ResponseEntity addGeoFenceByList(@RequestBody GeoFenceDto geoFenceDto) {
		try {
			return ResponseHelper.prepareSuccess(geoFenceService.saveByList(geoFenceDto));
		} catch (BusinessException e) {
			return ResponseHelper.prepareError(HttpStatus.INTERNAL_SERVER_ERROR.value(),
					new ResponseErrorPayload(e.getBusinessExceptionCode(), e.getMessage()));
		}
	}

}
