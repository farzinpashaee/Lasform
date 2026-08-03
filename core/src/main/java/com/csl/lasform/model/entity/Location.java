package com.csl.lasform.model.entity;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.*;

/**
 * A named place/waypoint, independent of any single device. Per-device position
 * tracking (with speed/heading/accuracy) lives on {@link Event}.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
@Document(collection = "locations")
public class Location extends Auditable implements Identifiable, Imageable {

    @Id
    private String id;

    @GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
    @NotNull
    private GeoJsonPoint point;

    private String name;

    private String description;

    private Double altitude;

    /** Reverse-geocoded address, cached to avoid repeated lookups. */
    private Address address;

    /** {@link Category} ids this location is classified under; a location may have several. */
    @Builder.Default
    private Set<String> categoryIds = new HashSet<>();

    /** Free-form labels for search/filtering, independent of {@link #categoryIds}. */
    @Indexed
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    /** Images stored on disk under {@code ImageStorageProperties.basePath}/{@link #id}/{filename}. */
    @Builder.Default
    private List<Image> images = new ArrayList<>();

    @Indexed
    @NotNull
    private Instant recordedAt;

    @CreatedDate
    private Instant receivedAt;

    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();
}
