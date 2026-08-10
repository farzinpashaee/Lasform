package com.csl.lasform.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
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
    private final MongoTemplate mongoTemplate;

    public DeviceServiceImpl(
            DeviceRepository deviceRepository, ImageStorageService imageStorageService, MongoTemplate mongoTemplate) {
        super(deviceRepository);
        this.deviceRepository = deviceRepository;
        this.imageStorageService = imageStorageService;
        this.imageService = new EntityImageService<>(deviceRepository, imageStorageService, "Device");
        this.mongoTemplate = mongoTemplate;
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
    public Page<Device> search(String q, String categoryId, List<String> tags, DeviceStatus status, Pageable pageable) {
        Query filter = filterQuery(q, categoryId, tags, status);
        long total = mongoTemplate.count(filter, Device.class);
        List<Device> content = mongoTemplate.find(filter.with(pageable), Device.class);
        return new PageImpl<>(content, pageable, total);
    }

    /** {@code categoryIds}/{@code tags} are arrays; equality/`in` on an array field means "contains any". */
    private Query filterQuery(String q, String categoryId, List<String> tags, DeviceStatus status) {
        List<Criteria> criteria = new ArrayList<>();
        if (categoryId != null && !categoryId.isBlank()) {
            criteria.add(Criteria.where("categoryIds").is(categoryId));
        }
        if (tags != null && !tags.isEmpty()) {
            criteria.add(Criteria.where("tags").in(tags));
        }
        if (status != null) {
            criteria.add(Criteria.where("status").is(status));
        }
        if (q != null && !q.isBlank()) {
            // Pattern.quote guards against regex metacharacters/ReDoS in user-supplied text.
            String pattern = Pattern.quote(q.trim());
            criteria.add(new Criteria().orOperator(
                    Criteria.where("name").regex(pattern, "i"),
                    Criteria.where("device_identifier").regex(pattern, "i"),
                    Criteria.where("tags").regex(pattern, "i")));
        }
        if (criteria.isEmpty()) {
            return new Query();
        }
        return new Query(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
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
