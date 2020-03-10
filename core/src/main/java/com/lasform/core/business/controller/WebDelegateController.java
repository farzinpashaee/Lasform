package com.lasform.core.business.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lasform.core.business.service.ApplicationService;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.SettingDto;

@RestController
@RequestMapping("/api/webDelegate")
public class WebDelegateController {

	@Autowired
	ApplicationService applicationService;

	@CrossOrigin(origins = "${lasform.application.web-face-url}")
	@PostMapping(value = "/initialSetting")
	private ResponseEntity<SettingDto> initialSetting() {
		return ResponseHelper.prepareSuccess(applicationService.getInitialSetting());
	}
}
