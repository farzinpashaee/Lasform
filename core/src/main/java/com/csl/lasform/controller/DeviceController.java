package com.csl.lasform.controller;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /** Paginated/sortable listing for the management table: optional free-text {@code q}, category, tag and/or status filters. */
    @GetMapping("/search")
    public Page<Device> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) DeviceStatus status,
            Pageable pageable) {
        return deviceService.search(q, categoryId, tags, status, pageable);
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
