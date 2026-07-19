package com.csl.lasform.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.exception.DuplicateResourceException;
import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.enums.DeviceStatus;
import com.csl.lasform.repository.DeviceRepository;
import com.csl.lasform.service.DeviceService;

@Service
@Validated
public class DeviceServiceImpl extends AbstractCrudService<Device, String> implements DeviceService {

    private final DeviceRepository deviceRepository;

    public DeviceServiceImpl(DeviceRepository deviceRepository) {
        super(deviceRepository);
        this.deviceRepository = deviceRepository;
    }

    @Override
    public Device create(Device entity) {
        if (deviceRepository.existsByDeviceIdentifier(entity.getDeviceIdentifier())) {
            throw new DuplicateResourceException(
                    "Device identifier already registered: " + entity.getDeviceIdentifier());
        }
        return super.create(entity);
    }

    @Override
    public Device findByDeviceIdentifier(String deviceIdentifier) {
        return deviceRepository.findByDeviceIdentifier(deviceIdentifier)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Device not found with identifier: " + deviceIdentifier));
    }

    @Override
    public List<Device> findByOwnerId(String ownerId) {
        return deviceRepository.findByOwnerId(ownerId);
    }

    @Override
    public List<Device> findByStatus(DeviceStatus status) {
        return deviceRepository.findByStatus(status);
    }

    @Override
    protected void applyUpdate(Device existing, Device incoming) {
        existing.setName(incoming.getName());
        existing.setType(incoming.getType());
        existing.setStatus(incoming.getStatus());
        existing.setLastKnownPoint(incoming.getLastKnownPoint());
        existing.setLastSeenAt(incoming.getLastSeenAt());
        existing.setBatteryLevel(incoming.getBatteryLevel());
        existing.setMetadata(incoming.getMetadata());
    }

    @Override
    protected String entityName() {
        return "Device";
    }
}
