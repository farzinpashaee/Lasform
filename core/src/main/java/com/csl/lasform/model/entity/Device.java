package com.csl.lasform.model.entity;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.csl.lasform.model.entity.enums.DeviceStatus;
import com.csl.lasform.model.entity.enums.DeviceType;

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
@Document(collection = "devices")
public class Device extends Auditable implements Identifiable {

    @Id
    private String id;

    /** Hardware-reported identifier (IMEI/serial), distinct from the Mongo id. */
    @Indexed(unique = true)
    @NotBlank
    @Field("device_identifier")
    private String deviceIdentifier;

    @NotBlank
    private String name;

    @Indexed
    @NotNull
    private String ownerId;

    @NotNull
    private DeviceType type;

    @Indexed
    @Builder.Default
    private DeviceStatus status = DeviceStatus.INACTIVE;

    /** Denormalized last-known position, kept in sync from the Location stream for fast map rendering. */
    private GeoJsonPoint lastKnownPoint;

    private Instant lastSeenAt;

    private Integer batteryLevel;

    @Builder.Default
    private Map<String, String> metadata = new HashMap<>();

    @Version
    private Long version;
}
