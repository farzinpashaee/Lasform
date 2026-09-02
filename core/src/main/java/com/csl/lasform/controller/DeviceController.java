package com.csl.lasform.controller;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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

    // Overriding an @GetMapping/@PatchMapping/@DeleteMapping-annotated base method means
    // re-declaring the mapping annotation here too — Spring MVC's handler scan looks at the
    // actual (overriding) Method object, and annotations aren't inherited across an @Override in
    // plain Java reflection, so omitting it would silently drop the endpoint rather than just
    // leave it unguarded.

    @Override
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('device:read')")
    public Device getById(@PathVariable String id) {
        return super.getById(id);
    }

    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('device:read')")
    public Page<Device> list(Pageable pageable) {
        return super.list(pageable);
    }

    @Override
    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('device:write')")
    public Device update(@PathVariable String id, @RequestBody Device entity) {
        return super.update(id, entity);
    }

    @Override
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('device:delete')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return super.delete(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('device:write')")
    public ResponseEntity<Device> create(@Valid @RequestBody Device entity) {
        return createOne(entity);
    }

    @GetMapping("/by-identifier/{deviceIdentifier}")
    @PreAuthorize("hasAuthority('device:read')")
    public Device getByIdentifier(@PathVariable String deviceIdentifier) {
        return deviceService.findByDeviceIdentifier(deviceIdentifier);
    }

    // Lets an unauthenticated device (the Android client's setup screen, before it has any
    // credentials) confirm its deviceIdentifier is registered, without exposing the full Device
    // record the way getByIdentifier() above does. Same public-read-carve-out pattern as
    // LocationController's map:view_public endpoints.
    @GetMapping("/by-identifier/{deviceIdentifier}/validate")
    @PreAuthorize("hasAuthority('device:read') or hasAuthority('device:validate_self')")
    public DeviceValidationResponse validateByIdentifier(@PathVariable String deviceIdentifier) {
        Device device = deviceService.findByDeviceIdentifier(deviceIdentifier);
        return new DeviceValidationResponse(device.getDeviceIdentifier(), device.getStatus());
    }

    /** Same permission as update() — regenerating is a write to the device, not a separate capability. */
    @PostMapping("/{id}/identifier/regenerate")
    @PreAuthorize("hasAuthority('device:write')")
    public Device regenerateIdentifier(@PathVariable String id) {
        return deviceService.regenerateIdentifier(id);
    }

    /** Paginated/sortable listing for the management table: optional free-text {@code q}, category, tag and/or status filters. */
    @GetMapping("/search")
    @PreAuthorize("hasAuthority('device:read')")
    public Page<Device> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) DeviceStatus status,
            Pageable pageable) {
        return deviceService.search(q, categoryId, tags, status, pageable);
    }

    @PostMapping("/{id}/images")
    @PreAuthorize("hasAuthority('device:write')")
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
    @PreAuthorize("hasAuthority('device:read')")
    public ResponseEntity<Resource> getImage(@PathVariable String id, @PathVariable String filename) {
        Resource image = deviceService.loadImage(id, filename);
        MediaType contentType = MediaTypeFactory.getMediaType(image).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(contentType).body(image);
    }

    @DeleteMapping("/{id}/images/{filename}")
    @PreAuthorize("hasAuthority('device:write')")
    public ResponseEntity<Void> deleteImage(@PathVariable String id, @PathVariable String filename) {
        deviceService.deleteImage(id, filename);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/images/{filename}/primary")
    @PreAuthorize("hasAuthority('device:write')")
    public Image setPrimaryImage(@PathVariable String id, @PathVariable String filename) {
        return deviceService.setPrimaryImage(id, filename);
    }
}
