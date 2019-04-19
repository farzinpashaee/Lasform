package com.lasform.core.business.controller;

import com.lasform.core.business.service.ThirdPartyService;
import com.lasform.core.model.dto.DirectionRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/thirdParty")
@EnableWebSecurity
public class ThirdPartyController {

    @Autowired
    ThirdPartyService thirdPartyService;

    @GetMapping(value = "/script" , produces = "text/javascript")
    private String script(){
        return thirdPartyService.getBaseApi();
    }

    @PostMapping(value = "/direction" , produces = "application/json")
    private String direction(@RequestBody DirectionRequest directionRequest){
        return thirdPartyService.getDirection(directionRequest);
    }

}
