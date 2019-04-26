package com.lasform.core.business.controller;

import com.lasform.core.business.exceptions.BusinessException;
import com.lasform.core.business.service.GeoAreaService;
import com.lasform.core.business.service.GeoFenceService;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.GeoAreaDto;
import com.lasform.core.model.dto.GeoFenceDto;
import com.lasform.core.model.dto.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/geoArea")
@EnableWebSecurity
public class GeoAreaController {

    @Autowired
    GeoAreaService geoAreaService;

    @Autowired
    GeoFenceService geoFenceService;

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
        return ResponseHelper.prepareSuccess( geoAreaService.findByName(geoAreaDto.getName()));
    }

    @PostMapping(value="/search")
    private Response search(@RequestBody GeoAreaDto geoAreaDto){
        return ResponseHelper.prepareSuccess( geoAreaService.search( geoAreaDto ) );
    }

    @PostMapping(value="/addGeoAreaByList")
    private Response addGeoAreaByList(@RequestBody GeoAreaDto geoAreaDto){
        try {
            return ResponseHelper.prepareSuccess( geoAreaService.saveByList(geoAreaDto));
        } catch (BusinessException e) {
            return ResponseHelper.prepareError( e.getBusinessExceptionCode() , e.getMessage() );
        }
    }

    @PostMapping(value="/findGeoFenceById")
    private Response findGeoFenceById(@RequestBody GeoFenceDto geoFenceDto){
        return ResponseHelper.prepareSuccess( geoFenceService.findById( geoFenceDto.getId() ) );
    }

    @PostMapping(value="/findGeoFenceByName")
    private Response findGeoFenceByName(@RequestBody GeoFenceDto geoFenceDto){
        return ResponseHelper.prepareSuccess( geoFenceService.findByName( geoFenceDto.getName() ) );
    }

    @PostMapping(value="/searchGeoFence")
    private Response searchGeoFence(@RequestBody GeoFenceDto geoFenceDto){
        return ResponseHelper.prepareSuccess(geoFenceService.search(geoFenceDto));
    }

    @PostMapping(value="/addGeoFence")
    private Response addGeoFence(@RequestBody GeoFenceDto geoFenceDto){
        return null;
    }


}
