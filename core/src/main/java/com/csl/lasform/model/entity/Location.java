package com.csl.lasform.model.entity;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Append-only device position ping. High write volume; no update timestamp is kept.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
@Document(collection = "locations")
@CompoundIndexes({
        @CompoundIndex(name = "device_recordedAt_idx", def = "{'deviceId': 1, 'recordedAt': -1}")
})
public class Location {

    @Id
    private String id;

    @Indexed
    @NotBlank
    private String deviceId;

    @GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
    @NotNull
    private GeoJsonPoint point;

    private Double altitude;

    /** Speed over ground, in meters/second. */
    private Double speed;

    /** Heading in degrees, 0-360. */
    private Double heading;

    /** Reported accuracy radius, in meters. */
    private Double accuracy;

    /** Reverse-geocoded address, cached to avoid repeated lookups. */
    private String address;

    @Indexed
    @NotNull
    private Instant recordedAt;

    @CreatedDate
    private Instant receivedAt;

    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();
}
