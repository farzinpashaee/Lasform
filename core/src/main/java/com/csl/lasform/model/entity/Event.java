package com.csl.lasform.model.entity;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.csl.lasform.model.entity.enums.EventSource;
import com.csl.lasform.model.entity.enums.EventType;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Append-only domain/system event log, distinct from {@link Alert}: an Event is a
 * record of something that happened, an Alert is a subset that needs human attention.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
@Document(collection = "events")
public class Event extends Auditable implements Identifiable {

    @Id
    private String id;

    @Indexed
    @NotNull(message = "{validation.event.type.required}")
    private EventType type;

    @NotNull(message = "{validation.event.source.required}")
    private EventSource source;

    private String deviceId;

    private String userId;

    private Double speed;

    private Double heading;

    private Double accuracy;

    private Double altitude;

    @GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
    @NotNull(message = "{validation.event.point.required}")
    private GeoJsonPoint point;

    @Builder.Default
    private Map<String, Object> payload = new HashMap<>();

    @Indexed
    @NotNull(message = "{validation.event.occurredAt.required}")
    private Instant occurredAt;
}
