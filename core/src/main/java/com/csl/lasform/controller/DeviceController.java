package com.csl.lasform.controller;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Image;
import com.csl.lasform.model.entity.enums.DeviceStatus;
import com.csl.lasform.service.DeviceService;

import jakarta.validation.Valid;

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

    @PostMapping
    public ResponseEntity<Device> create(@Valid @RequestBody Device entity) {
        return createOne(entity);
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

    @PostMapping("/{id}/images")
    public ResponseEntity<Image> uploadImage(
            @PathVariable String id,
            @RequestParam MultipartFile file,
            @RequestParam(defaultValue = "false") boolean primary) {
        Image image = deviceService.addImage(id, file, primary);
        return ResponseEntity
                .created(ServletUriComponentsBuilder.fromCurrentRequestUri()
                        .path("/{filename}")
                        .buildAndExpand(image.getFilename())
                        .toUri())
                .body(image);
    }

    @GetMapping("/{id}/images/{filename}")
    public ResponseEntity<Resource> getImage(@PathVariable String id, @PathVariable String filename) {
        Resource image = deviceService.loadImage(id, filename);
        MediaType contentType = MediaTypeFactory.getMediaType(image).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(contentType).body(image);
    }

    @DeleteMapping("/{id}/images/{filename}")
    public ResponseEntity<Void> deleteImage(@PathVariable String id, @PathVariable String filename) {
        deviceService.deleteImage(id, filename);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/images/{filename}/primary")
    public Image setPrimaryImage(@PathVariable String id, @PathVariable String filename) {
        return deviceService.setPrimaryImage(id, filename);
    }
}
