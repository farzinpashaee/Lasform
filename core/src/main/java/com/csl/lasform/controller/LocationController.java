package com.csl.lasform.controller;

import java.util.List;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.model.entity.Location;
import com.csl.lasform.service.LocationService;

import jakarta.validation.Valid;

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

    @PostMapping
    public ResponseEntity<Location> create(@Valid @RequestBody Location entity) {
        return createOne(entity);
    }

    @GetMapping("/near")
    public GeoResults<Location> near(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam double radiusMeters) {
        return locationService.findNear(new Point(lng, lat), new Distance(radiusMeters));
    }

    @GetMapping("/search")
    public List<Location> search(
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) List<String> tags) {
        if (categoryId != null) {
            return locationService.findByCategoryId(categoryId);
        }
        if (tag != null) {
            return locationService.findByTag(tag);
        }
        if (tags != null && !tags.isEmpty()) {
            return locationService.findByTagsIn(tags);
        }
        throw new IllegalArgumentException("At least one of 'categoryId', 'tag' or 'tags' must be provided");
    }
}
