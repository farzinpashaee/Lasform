package com.csl.lasform.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.enums.DeviceStatus;
import com.csl.lasform.service.DeviceService;

@RestController
@RequestMapping("/api/v1/devices")
public class DeviceController extends AbstractCrudController<Device> {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @Override
    protected DeviceService service() {
        return deviceService;
    }

    @GetMapping("/by-identifier/{deviceIdentifier}")
    public Device getByIdentifier(@PathVariable String deviceIdentifier) {
        return deviceService.findByDeviceIdentifier(deviceIdentifier);
    }

    @GetMapping("/search")
    public List<Device> search(
            @RequestParam(required = false) String ownerId,
            @RequestParam(required = false) DeviceStatus status,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) List<String> tags) {
        if (ownerId != null) {
            return deviceService.findByOwnerId(ownerId);
        }
        if (status != null) {
            return deviceService.findByStatus(status);
        }
        if (tag != null) {
            return deviceService.findByTag(tag);
        }
        if (tags != null && !tags.isEmpty()) {
            return deviceService.findByTagsIn(tags);
        }
        throw new IllegalArgumentException(
                "At least one of 'ownerId', 'status', 'tag' or 'tags' must be provided");
    }
}
