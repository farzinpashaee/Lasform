package com.csl.lasform.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.Device;

public interface DeviceRepository extends MongoRepository<Device, String> {

    Optional<Device> findByDeviceIdentifier(String deviceIdentifier);
}
