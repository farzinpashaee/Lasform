package com.csl.lasform.controller;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
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

import com.csl.lasform.model.entity.Image;
import com.csl.lasform.model.entity.Location;
import com.csl.lasform.service.LocationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/locations")
public class LocationController extends AbstractCrudController<Location> {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @Override
    protected LocationService service() {
        return locationService;
    }

    // See DeviceController for why the mapping annotation must be repeated on each override.

    @Override
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('location:read')")
    public Location getById(@PathVariable String id) {
        return super.getById(id);
    }

    // The public/anonymous map view (web-face's "" route) loads its initial pins through this
    // exact endpoint, so it also accepts map:view_public — the one ANONYMOUS is granted — on top
    // of the normal location:read used everywhere else. If an admin later revokes map:view_public
    // from ANONYMOUS, this starts 401ing for anonymous callers again, same as any other
    // permission change; the frontend is expected to degrade to a "sign in to view the map"
    // state rather than treat that as a bug (see MapPage).
    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('location:read') or hasAuthority('map:view_public')")
    public Page<Location> list(Pageable pageable) {
        return super.list(pageable);
    }

    @Override
    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('location:write')")
    public Location update(@PathVariable String id, @RequestBody Location entity) {
        return super.update(id, entity);
    }

    @Override
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('location:delete')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return super.delete(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('location:write')")
    public ResponseEntity<Location> create(@Valid @RequestBody Location entity) {
        // Denormalized from reviews (see ReviewService) — never trust these from client input.
        // PATCH is already safe by construction (applyUpdate only copies an explicit allow-list
        // of fields that doesn't include these two), but create() saves the bound entity as-is.
        entity.setAverageRating(0.0);
        entity.setReviewCount(0);
        return createOne(entity);
    }

    @GetMapping("/near")
    @PreAuthorize("hasAuthority('location:read')")
    public GeoResults<Location> near(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam double radiusMeters) {
        return locationService.findNear(new Point(lng, lat), new Distance(radiusMeters));
    }

    /** Paginated/sortable listing for the management table: optional free-text {@code q}, category and/or tag filters. */
    @GetMapping("/search")
    @PreAuthorize("hasAuthority('location:read')")
    public Page<Location> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) List<String> tags,
            Pageable pageable) {
        return locationService.search(q, categoryId, tags, pageable);
    }

    @PostMapping("/{id}/images")
    @PreAuthorize("hasAuthority('location:write')")
    public ResponseEntity<Image> uploadImage(
            @PathVariable String id,
            @RequestParam MultipartFile file,
            @RequestParam(defaultValue = "false") boolean primary) {
        Image image = locationService.addImage(id, file, primary);
        return ResponseEntity
                .created(ServletUriComponentsBuilder.fromCurrentRequestUri()
                        .path("/{filename}")
                        .buildAndExpand(image.getFilename())
                        .toUri())
                .body(image);
    }

    @GetMapping("/{id}/images/{filename}")
    @PreAuthorize("hasAuthority('location:read')")
    public ResponseEntity<Resource> getImage(@PathVariable String id, @PathVariable String filename) {
        Resource image = locationService.loadImage(id, filename);
        MediaType contentType = MediaTypeFactory.getMediaType(image).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(contentType).body(image);
    }

    @DeleteMapping("/{id}/images/{filename}")
    @PreAuthorize("hasAuthority('location:write')")
    public ResponseEntity<Void> deleteImage(@PathVariable String id, @PathVariable String filename) {
        locationService.deleteImage(id, filename);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/images/{filename}/primary")
    @PreAuthorize("hasAuthority('location:write')")
    public Image setPrimaryImage(@PathVariable String id, @PathVariable String filename) {
        return locationService.setPrimaryImage(id, filename);
    }
}
