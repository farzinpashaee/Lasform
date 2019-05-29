package com.lasform.core.business.controller;

import com.lasform.core.business.service.ApplicationService;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webDelegate")
@EnableWebSecurity
public class WebDelegateController {

    @Autowired
    ApplicationService applicationService;

    @CrossOrigin(origins = "http://localhost:8080")
    @PostMapping(value="/initialSetting")
    private Response initialSetting(){
        return ResponseHelper.prepareSuccess( applicationService.getInitialSetting() );
    }
}
