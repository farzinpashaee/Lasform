package com.csl.lasform.model.entity;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

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

    @Indexed
    @NotNull
    private Instant recordedAt;

    @CreatedDate
    private Instant receivedAt;

    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();
}
