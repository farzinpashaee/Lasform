package com.csl.lasform.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.enums.DeviceStatus;

public interface DeviceRepository extends MongoRepository<Device, String> {

    Optional<Device> findByDeviceIdentifier(String deviceIdentifier);

    List<Device> findByOwnerId(String ownerId);

    List<Device> findByStatus(DeviceStatus status);

    List<Device> findByTagsContaining(String tag);

    /** Devices having at least one of the given tags. */
    List<Device> findByTagsIn(List<String> tags);

    boolean existsByDeviceIdentifier(String deviceIdentifier);
}
