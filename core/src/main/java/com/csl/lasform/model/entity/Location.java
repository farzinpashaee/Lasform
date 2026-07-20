package com.csl.lasform.model.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

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
public class Location extends Auditable implements Identifiable {

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

    @Indexed
    @NotNull
    private Instant recordedAt;

    @CreatedDate
    private Instant receivedAt;

    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();
}
