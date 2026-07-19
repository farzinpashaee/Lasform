package com.csl.lasform.controller;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.model.entity.Location;
import com.csl.lasform.service.LocationService;

@RestController
@RequestMapping("/api/v1/locations")
public class LocationController extends AbstractCrudController<Location> {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @Override
    protected LocationService service() {
        return locationService;
    }

    @GetMapping("/near")
    public GeoResults<Location> near(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam double radiusMeters) {
        return locationService.findNear(new Point(lng, lat), new Distance(radiusMeters));
    }
}
