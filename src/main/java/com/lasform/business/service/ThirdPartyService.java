package com.lasform.business.service;


import com.lasform.helper.ResponseHelper;
import com.lasform.model.dto.DirectionRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.client.RestTemplate;

@Service
public class ThirdPartyService {

    @Value("${lasform.map.api.key}")
    private String apiKey ;

    @Value("${lasform.map.api.url}")
    private String apiUrl ;

    @Value("${lasform.map.api.geoDirection.url}")
    private String apiGeoDirectionUrl ;

    public String getBaseApi(){
        RestTemplate restTemplate = new RestTemplate();
        return restTemplate.getForObject(apiUrl+apiKey, String.class);
    }

    public String getDirection(@RequestBody DirectionRequest directionRequest){
        RestTemplate restTemplate = new RestTemplate();
        StringBuilder routQuery = new StringBuilder();
        routQuery.append("origin=")
                .append(directionRequest.getOrigin().getLatitude())
                .append(",")
                .append(directionRequest.getOrigin().getLongitude())
                .append("&destination=")
                .append(directionRequest.getDestination().getLatitude())
                .append(",")
                .append(directionRequest.getDestination().getLongitude())
                .append("&mode=")
                .append(directionRequest.getMode());
        String googleResponse = restTemplate.getForObject(apiGeoDirectionUrl+routQuery.toString()+"&key="+apiKey, String.class);
        return ResponseHelper.prepareStringSuccess(googleResponse);
    }



}
