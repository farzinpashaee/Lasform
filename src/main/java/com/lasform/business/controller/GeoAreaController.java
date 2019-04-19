package com.lasform.business.controller;

import com.lasform.business.exceptions.BusinessException;
import com.lasform.business.exceptions.EmptyFieldException;
import com.lasform.business.service.GeoAreaService;
import com.lasform.helper.ResponseHelper;
import com.lasform.model.dto.GeoAreaDto;
import com.lasform.model.dto.LocationDto;
import com.lasform.model.dto.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/location")
@EnableWebSecurity
public class GeoAreaController {

    @Autowired
    GeoAreaService geoAreaService;

    @PostMapping(value="/find")
    private Response find(@RequestBody GeoAreaDto geoAreaDto){
        return ResponseHelper.prepareSuccess( geoAreaService.findById(geoAreaDto.getId()));
    }

    @PostMapping(value="/findById")
    private Response findById(@RequestBody GeoAreaDto geoAreaDto){
        return ResponseHelper.prepareSuccess( geoAreaService.findById(geoAreaDto.getId()));
    }

    @PostMapping(value="/findByName")
    private Response findByName(@RequestBody GeoAreaDto geoAreaDto){
        return ResponseHelper.prepareSuccess( geoAreaService.findById(geoAreaDto.getId()));
    }

    @PostMapping(value="/addGeoAreaByList")
    private Response addGeoAreaByList(@RequestBody GeoAreaDto geoAreaDto){
        try {
            return ResponseHelper.prepareSuccess( geoAreaService.saveByList(geoAreaDto));
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/findGeofence")
    private Response findGeofence(@RequestBody GeoAreaDto geoAreaDto){
        return ResponseHelper.prepareSuccess( geoAreaService.findById(geoAreaDto.getId()));
    }

}
