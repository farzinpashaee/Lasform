package com.lasform.business.controller;

import com.lasform.business.service.ApplicationService;
import com.lasform.helper.ResponseHelper;
import com.lasform.model.dto.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webDelegate")
@EnableWebSecurity
public class WebDelegateController {

    @Autowired
    ApplicationService applicationService;

    @PostMapping(value="/initialSetting")
    private Response initialSetting(){
        return ResponseHelper.prepareSuccess( applicationService.getInitialSetting() );
    }
}