package com.csl.lasform.controller;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
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

    @PostMapping
    public ResponseEntity<Location> create(@Valid @RequestBody Location entity) {
        return createOne(entity);
    }

    @GetMapping("/near")
    public GeoResults<Location> near(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam double radiusMeters) {
        return locationService.findNear(new Point(lng, lat), new Distance(radiusMeters));
    }

    @GetMapping("/search")
    public List<Location> search(
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) List<String> tags) {
        if (categoryId != null) {
            return locationService.findByCategoryId(categoryId);
        }
        if (tag != null) {
            return locationService.findByTag(tag);
        }
        if (tags != null && !tags.isEmpty()) {
            return locationService.findByTagsIn(tags);
        }
        throw new IllegalArgumentException("At least one of 'categoryId', 'tag' or 'tags' must be provided");
    }

    @PostMapping("/{id}/images")
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
    public ResponseEntity<Resource> getImage(@PathVariable String id, @PathVariable String filename) {
        Resource image = locationService.loadImage(id, filename);
        MediaType contentType = MediaTypeFactory.getMediaType(image).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(contentType).body(image);
    }

    @DeleteMapping("/{id}/images/{filename}")
    public ResponseEntity<Void> deleteImage(@PathVariable String id, @PathVariable String filename) {
        locationService.deleteImage(id, filename);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/images/{filename}/primary")
    public Image setPrimaryImage(@PathVariable String id, @PathVariable String filename) {
        return locationService.setPrimaryImage(id, filename);
    }
}
