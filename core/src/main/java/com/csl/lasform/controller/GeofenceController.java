package com.csl.lasform.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.model.entity.Geofence;
import com.csl.lasform.model.entity.enums.GeofenceStatus;
import com.csl.lasform.service.GeofenceService;

import jakarta.validation.Valid;

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

    // See DeviceController for why the mapping annotation must be repeated on each override.

    @Override
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('geofence:read')")
    public Geofence getById(@PathVariable String id) {
        return super.getById(id);
    }

    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('geofence:read')")
    public Page<Geofence> list(Pageable pageable) {
        return super.list(pageable);
    }

    @Override
    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('geofence:write')")
    public Geofence update(@PathVariable String id, @RequestBody Geofence entity) {
        return super.update(id, entity);
    }

    @Override
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('geofence:delete')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return super.delete(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('geofence:write')")
    public ResponseEntity<Geofence> create(@Valid @RequestBody Geofence entity) {
        return createOne(entity);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('geofence:read')")
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
        throw new BadRequestException("error.geofence.filterRequired");
    }
}
