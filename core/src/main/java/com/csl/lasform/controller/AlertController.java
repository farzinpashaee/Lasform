package com.csl.lasform.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.model.entity.Alert;
import com.csl.lasform.model.entity.enums.AlertStatus;
import com.csl.lasform.service.AlertService;

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

    @GetMapping("/search")
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
        throw new IllegalArgumentException("At least one of 'deviceId' or 'status' must be provided");
    }

    @GetMapping("/count")
    public long count(@RequestParam AlertStatus status) {
        return alertService.countByStatus(status);
    }
}
