package com.csl.lasform.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.model.entity.Geofence;
import com.csl.lasform.model.entity.enums.GeofenceStatus;
import com.csl.lasform.service.GeofenceService;

@RestController
@RequestMapping("/api/v1/geofences")
public class GeofenceController extends AbstractCrudController<Geofence> {

    private final GeofenceService geofenceService;

    public GeofenceController(GeofenceService geofenceService) {
        this.geofenceService = geofenceService;
    }

    @Override
    protected GeofenceService service() {
        return geofenceService;
    }

    @GetMapping("/search")
    public List<Geofence> search(
            @RequestParam(required = false) String ownerId,
            @RequestParam(required = false) GeofenceStatus status,
            @RequestParam(required = false) String deviceId) {
        if (ownerId != null) {
            return geofenceService.findByOwnerId(ownerId);
        }
        if (status != null) {
            return geofenceService.findByStatus(status);
        }
        if (deviceId != null) {
            return geofenceService.findByDeviceId(deviceId);
        }
        throw new IllegalArgumentException("At least one of 'ownerId', 'status' or 'deviceId' must be provided");
    }
}
