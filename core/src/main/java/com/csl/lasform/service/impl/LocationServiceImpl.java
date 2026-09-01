package com.csl.lasform.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.geo.GeoJsonPolygon;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.multipart.MultipartFile;

import com.csl.lasform.model.entity.Image;
import com.csl.lasform.model.entity.Location;
import com.csl.lasform.repository.LocationRepository;
import com.csl.lasform.service.ImageStorageService;
import com.csl.lasform.service.LocationService;

@Service
@Validated
public class LocationServiceImpl extends AbstractCrudService<Location, String> implements LocationService {

    private final LocationRepository locationRepository;
    private final ImageStorageService imageStorageService;
    private final EntityImageService<Location> imageService;
    private final MongoTemplate mongoTemplate;

    public LocationServiceImpl(
            LocationRepository locationRepository, ImageStorageService imageStorageService, MongoTemplate mongoTemplate) {
        super(locationRepository);
        this.locationRepository = locationRepository;
        this.imageStorageService = imageStorageService;
        this.imageService = new EntityImageService<>(locationRepository, imageStorageService, "error.location.notFound");
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public GeoResults<Location> findNear(Point point, Distance distance) {
        return locationRepository.findByPointNear(point, distance);
    }

    @Override
    public Page<Location> search(String q, String categoryId, List<String> tags, Pageable pageable) {
        Query filter = filterQuery(q, categoryId, tags);
        long total = mongoTemplate.count(filter, Location.class);
        List<Location> content = mongoTemplate.find(filter.with(pageable), Location.class);
        return new PageImpl<>(content, pageable, total);
    }

    @Override
    public List<Location> findWithinBounds(double west, double south, double east, double north, int limit) {
        // A zero-area box (e.g. a caller's map reporting its bounds before it has an actual pixel
        // viewport to unproject) reaches MongoDB as a polygon ring with fewer than 3 distinct
        // vertices, which errors ("Loop must have at least 3 different vertices") rather than just
        // matching nothing — so short-circuit here instead of forwarding a query that can't succeed.
        if (west == east || south == north) {
            return List.of();
        }
        // point is a GeoJsonPoint under a 2dsphere index, so the box has to be a GeoJSON geometry
        // (Criteria.within(Box) generates a legacy $box, which 2dsphere doesn't support) — a
        // 5-point ring, first/last coordinate repeated to close it, going around once.
        GeoJsonPolygon box = new GeoJsonPolygon(
                new Point(west, south),
                new Point(east, south),
                new Point(east, north),
                new Point(west, north),
                new Point(west, south));
        Query query = new Query(Criteria.where("point").within(box)).limit(limit);
        return mongoTemplate.find(query, Location.class);
    }

    /** {@code categoryIds}/{@code tags} are arrays; equality/`in` on an array field means "contains any". */
    private Query filterQuery(String q, String categoryId, List<String> tags) {
        List<Criteria> criteria = new ArrayList<>();
        if (categoryId != null && !categoryId.isBlank()) {
            criteria.add(Criteria.where("categoryIds").is(categoryId));
        }
        if (tags != null && !tags.isEmpty()) {
            criteria.add(Criteria.where("tags").in(tags));
        }
        if (q != null && !q.isBlank()) {
            // Pattern.quote guards against regex metacharacters/ReDoS in user-supplied text.
            String pattern = Pattern.quote(q.trim());
            criteria.add(new Criteria().orOperator(
                    Criteria.where("name").regex(pattern, "i"),
                    Criteria.where("description").regex(pattern, "i"),
                    Criteria.where("tags").regex(pattern, "i")));
        }
        if (criteria.isEmpty()) {
            return new Query();
        }
        return new Query(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
    }

    @Override
    protected void applyUpdate(Location existing, Location incoming) {
        existing.setPoint(incoming.getPoint());
        existing.setName(incoming.getName());
        existing.setDescription(incoming.getDescription());
        existing.setAltitude(incoming.getAltitude());
        existing.setAddress(incoming.getAddress());
        existing.setPhoneNumbers(incoming.getPhoneNumbers());
        existing.setCategoryIds(incoming.getCategoryIds());
        existing.setTags(incoming.getTags());
        existing.setImages(incoming.getImages());
        existing.setMetadata(incoming.getMetadata());
    }

    @Override
    protected String notFoundMessageCode() {
        return "error.location.notFound";
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
