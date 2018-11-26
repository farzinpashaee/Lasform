package com.lasform.business.controller;

import com.lasform.helper.ResponseHelper;
import com.lasform.model.dto.DirectionRequest;
import com.lasform.model.dto.LocationBoundary;
import com.lasform.model.dto.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/thirdParty")
@EnableWebSecurity
public class ThirdPartyController {

    @Value("${lasform.map.api.key}")
    private String apiKey ;


    @GetMapping(value = "/googleMapApi" , produces = "text/javascript")
    private String googleApi(){
        RestTemplate restTemplate = new RestTemplate();
        return restTemplate.getForObject("https://maps.googleapis.com/maps/api/js?key="+apiKey, String.class);
    }

    @PostMapping(value = "/googleMapDirection" , produces = "application/json")
    private String googleDirection(@RequestBody DirectionRequest directionRequest){
        RestTemplate restTemplate = new RestTemplate();
        StringBuilder routQuery = new StringBuilder();
        routQuery.append("origin=")
                .append(directionRequest.getOrigin().getLatitude())
                .append(",")
                .append(directionRequest.getOrigin().getLongitude())
                .append("&destination=")
                .append(directionRequest.getDestination().getLatitude())
                .append(",")
                .append(directionRequest.getDestination().getLongitude());
        String googleResponse = restTemplate.getForObject("https://maps.googleapis.com/maps/api/directions/json?"+routQuery.toString()+"&key="+apiKey, String.class);
        return ResponseHelper.prepareStringSuccess(googleResponse);
    }

}
