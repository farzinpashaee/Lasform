package com.csl.lasform.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.model.entity.Alert;
import com.csl.lasform.model.entity.enums.AlertStatus;
import com.csl.lasform.repository.AlertRepository;
import com.csl.lasform.service.AlertService;

@Service
@Validated
public class AlertServiceImpl extends AbstractCrudService<Alert, String> implements AlertService {

    private final AlertRepository alertRepository;

    public AlertServiceImpl(AlertRepository alertRepository) {
        super(alertRepository);
        this.alertRepository = alertRepository;
    }

    @Override
    public List<Alert> findByDeviceId(String deviceId) {
        return alertRepository.findByDeviceIdOrderByTriggeredAtDesc(deviceId);
    }

    @Override
    public List<Alert> findByStatus(AlertStatus status) {
        return alertRepository.findByStatus(status);
    }

    @Override
    public List<Alert> findByDeviceIdAndStatus(String deviceId, AlertStatus status) {
        return alertRepository.findByDeviceIdAndStatus(deviceId, status);
    }

    @Override
    public long countByStatus(AlertStatus status) {
        return alertRepository.countByStatus(status);
    }

    @Override
    protected void applyUpdate(Alert existing, Alert incoming) {
        existing.setType(incoming.getType());
        existing.setSeverity(incoming.getSeverity());
        existing.setStatus(incoming.getStatus());
        existing.setMessage(incoming.getMessage());
        existing.setTriggerPoint(incoming.getTriggerPoint());
        existing.setTriggeredAt(incoming.getTriggeredAt());
        existing.setAcknowledgedAt(incoming.getAcknowledgedAt());
        existing.setAcknowledgedByUserId(incoming.getAcknowledgedByUserId());
        existing.setResolvedAt(incoming.getResolvedAt());
    }

    @Override
    protected String entityName() {
        return "Alert";
    }
}
