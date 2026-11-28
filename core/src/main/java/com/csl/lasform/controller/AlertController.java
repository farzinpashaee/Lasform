package com.csl.lasform.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.auth.infrastructure.security.JwtPrincipal;
import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.model.entity.Alert;
import com.csl.lasform.model.entity.enums.AlertStatus;
import com.csl.lasform.service.AlertService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/alerts")
public class AlertController extends AbstractCrudController<Alert> {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @Override
    protected AlertService service() {
        return alertService;
    }

    // See DeviceController for why the mapping annotation must be repeated on each override.

    @Override
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('alert:read')")
    public Alert getById(@PathVariable String id) {
        return super.getById(id);
    }

    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('alert:read')")
    public Page<Alert> list(Pageable pageable) {
        return super.list(pageable);
    }

    @Override
    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('alert:write')")
    public Alert update(@PathVariable String id, @RequestBody Alert entity) {
        return super.update(id, entity);
    }

    @Override
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('alert:delete')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return super.delete(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('alert:write')")
    public ResponseEntity<Alert> create(@Valid @RequestBody Alert entity) {
        return createOne(entity);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('alert:read')")
    public List<Alert> search(
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) AlertStatus status) {
        if (deviceId != null && status != null) {
            return alertService.findByDeviceIdAndStatus(deviceId, status);
        }
        if (deviceId != null) {
            return alertService.findByDeviceId(deviceId);
        }
        if (status != null) {
            return alertService.findByStatus(status);
        }
        throw new BadRequestException("error.alert.filterRequired");
    }

    @GetMapping("/count")
    @PreAuthorize("hasAuthority('alert:read')")
    public long count(@RequestParam AlertStatus status) {
        return alertService.countByStatus(status);
    }

    /**
     * Marking an alert read is a viewing action, not an authoring one — gated on alert:read
     * rather than alert:write — and acknowledgedByUserId is always the caller's own id, never
     * client-supplied (same rationale as Rule/Geofence#ownerId).
     */
    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAuthority('alert:read')")
    public Alert acknowledge(@PathVariable String id, Authentication authentication) {
        JwtPrincipal principal = (JwtPrincipal) authentication.getPrincipal();
        return alertService.acknowledge(id, principal.userId());
    }
}
