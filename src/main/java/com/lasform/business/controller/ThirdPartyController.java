package com.lasform.business.controller;

import com.lasform.business.service.ThirdPartyService;
import com.lasform.model.dto.DirectionRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/thirdParty")
@EnableWebSecurity
public class ThirdPartyController {

    @Autowired
    ThirdPartyService thirdPartyService;

    @GetMapping(value = "/mapApi" , produces = "text/javascript")
    private String googleApi(){
        return thirdPartyService.getBaseApi();
    }

    @PostMapping(value = "/mapDirection" , produces = "application/json")
    private String googleDirection(@RequestBody DirectionRequest directionRequest){
        return thirdPartyService.getDirection(directionRequest);
    }

}
