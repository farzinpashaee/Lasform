package com.csl.lasform.model.entity;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import com.csl.lasform.model.entity.enums.AlertSeverity;
import com.csl.lasform.model.entity.enums.AlertStatus;
import com.csl.lasform.model.entity.enums.AlertType;

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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@Document(collection = "alerts")
@CompoundIndexes({
        @CompoundIndex(name = "device_status_idx", def = "{'deviceId': 1, 'status': 1}")
})
public class Alert extends Auditable implements Identifiable {

    @Id
    private String id;

    @Indexed
    @NotBlank
    private String deviceId;

    /** Set only for geofence-triggered alerts. */
    private String geofenceId;

    @NotNull
    private AlertType type;

    @Builder.Default
    private AlertSeverity severity = AlertSeverity.MEDIUM;

    @Indexed
    @Builder.Default
    private AlertStatus status = AlertStatus.NEW;

    private String message;

    /** Device position at the moment the alert fired. */
    private GeoJsonPoint triggerPoint;

    @Indexed
    @NotNull
    private Instant triggeredAt;

    private Instant acknowledgedAt;

    private String acknowledgedByUserId;

    private Instant resolvedAt;
}
