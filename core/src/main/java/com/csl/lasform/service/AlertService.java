package com.csl.lasform.service;

import java.util.List;

import com.csl.lasform.model.entity.Alert;
import com.csl.lasform.model.entity.enums.AlertStatus;

public interface AlertService extends CrudService<Alert, String> {

    List<Alert> findByDeviceId(String deviceId);

    List<Alert> findByStatus(AlertStatus status);

    List<Alert> findByDeviceIdAndStatus(String deviceId, AlertStatus status);

    long countByStatus(AlertStatus status);

    /** Marks an alert read: sets status=ACKNOWLEDGED, acknowledgedByUserId, acknowledgedAt=now(), server-side. */
    Alert acknowledge(String id, String userId);
}
