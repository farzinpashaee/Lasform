package com.csl.lasform.model.entity;

import java.util.HashSet;
import java.util.Set;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.geo.GeoJsonPolygon;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.csl.lasform.model.entity.enums.GeofenceShape;
import com.csl.lasform.model.entity.enums.GeofenceStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Either a CIRCLE (center + radiusMeters) or a POLYGON (boundary) — the pair used
 * depends on {@link #shape}. Only the boundary is geo-indexed since MongoDB's
 * 2dsphere index does not support indexing plain center/radius pairs directly.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@Document(collection = "geofences")
public class Geofence extends Auditable implements Identifiable {

    @Id
    private String id;

    @NotBlank
    private String name;

    private String description;

    @Indexed
    @NotNull
    private String ownerId;

    @NotNull
    private GeofenceShape shape;

    private GeoJsonPoint center;

    private Double radiusMeters;

    @GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
    private GeoJsonPolygon boundary;

    @Indexed
    @Builder.Default
    private GeofenceStatus status = GeofenceStatus.ACTIVE;

    /** Devices this geofence applies to; empty means it applies to all of the owner's devices. */
    @Builder.Default
    private Set<String> deviceIds = new HashSet<>();

    @Version
    private Long version;
}
