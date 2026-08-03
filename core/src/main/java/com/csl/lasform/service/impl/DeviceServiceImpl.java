package com.csl.lasform.service.impl;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.multipart.MultipartFile;

import com.csl.lasform.exception.DuplicateResourceException;
import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Image;
import com.csl.lasform.model.entity.enums.DeviceStatus;
import com.csl.lasform.repository.DeviceRepository;
import com.csl.lasform.service.DeviceService;
import com.csl.lasform.service.ImageStorageService;

@Service
@Validated
public class DeviceServiceImpl extends AbstractCrudService<Device, String> implements DeviceService {

    private final DeviceRepository deviceRepository;
    private final ImageStorageService imageStorageService;
    private final EntityImageService<Device> imageService;

    public DeviceServiceImpl(DeviceRepository deviceRepository, ImageStorageService imageStorageService) {
        super(deviceRepository);
        this.deviceRepository = deviceRepository;
        this.imageStorageService = imageStorageService;
        this.imageService = new EntityImageService<>(deviceRepository, imageStorageService, "Device");
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
    public List<Device> findByTag(String tag) {
        return deviceRepository.findByTagsContaining(tag);
    }

    @Override
    public List<Device> findByTagsIn(List<String> tags) {
        return deviceRepository.findByTagsIn(tags);
    }

    @Override
    protected void applyUpdate(Device existing, Device incoming) {
        existing.setName(incoming.getName());
        existing.setType(incoming.getType());
        existing.setStatus(incoming.getStatus());
        existing.setLastKnownPoint(incoming.getLastKnownPoint());
        existing.setLastSeenAt(incoming.getLastSeenAt());
        existing.setBatteryLevel(incoming.getBatteryLevel());
        existing.setCategoryIds(incoming.getCategoryIds());
        existing.setTags(incoming.getTags());
        existing.setImages(incoming.getImages());
        existing.setMetadata(incoming.getMetadata());
    }

    @Override
    protected String entityName() {
        return "Device";
    }

    @Override
    protected void afterDelete(String id) {
        imageStorageService.deleteAll(id);
    }

    @Override
    public Image addImage(String ownerId, MultipartFile file, boolean primary) {
        return imageService.addImage(ownerId, file, primary);
    }

    @Override
    public Resource loadImage(String ownerId, String filename) {
        return imageService.loadImage(ownerId, filename);
    }

    @Override
    public void deleteImage(String ownerId, String filename) {
        imageService.deleteImage(ownerId, filename);
    }

    @Override
    public Image setPrimaryImage(String ownerId, String filename) {
        return imageService.setPrimaryImage(ownerId, filename);
    }
}
