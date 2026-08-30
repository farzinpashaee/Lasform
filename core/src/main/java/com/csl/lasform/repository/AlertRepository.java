package com.csl.lasform.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.Alert;
import com.csl.lasform.model.entity.enums.AlertStatus;

public interface AlertRepository extends MongoRepository<Alert, String> {

    List<Alert> findByDeviceIdOrderByTriggeredAtDesc(String deviceId);

    List<Alert> findByStatus(AlertStatus status);

    List<Alert> findByDeviceIdAndStatus(String deviceId, AlertStatus status);

    long countByStatus(AlertStatus status);
}
