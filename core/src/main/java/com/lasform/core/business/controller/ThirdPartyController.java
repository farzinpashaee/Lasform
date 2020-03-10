package com.lasform.core.business.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lasform.core.business.service.implementation.ThirdPartyLocationServiceImp;
import com.lasform.core.model.dto.DirectionRequest;

@RestController
@RequestMapping("/api/thirdParty")
// @EnableWebSecurity
// @CrossOrigin(origins = "${lasform.application.web-face-url}")
public class ThirdPartyController {

	@Autowired
	ThirdPartyLocationServiceImp thirdPartyService;

	@GetMapping(value = "/script", produces = "text/javascript; charset=utf-8")
	private String script() {
		return thirdPartyService.getBaseApi();
	}

	@PostMapping(value = "/direction", produces = "application/json")
	private String direction(@RequestBody DirectionRequest directionRequest) {
		return thirdPartyService.getDirection(directionRequest);
	}

}
