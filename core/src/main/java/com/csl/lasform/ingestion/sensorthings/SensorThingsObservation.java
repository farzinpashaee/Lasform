package com.csl.lasform.ingestion.sensorthings;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.mongodb.core.geo.GeoJsonPoint;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * A pragmatic subset of the OGC SensorThings API's Observation entity — enough for a device to
 * self-report one reading, without requiring the full Datastream/Thing/ObservedProperty/
 * FeatureOfInterest entity graph this API normally implies. {@code result} is left as {@code
 * Object} because the spec allows any JSON value there; when it's an object we look for the
 * common telemetry fields ({@code speed}/{@code heading}/{@code accuracy}/{@code altitude}/
 * {@code batteryLevel}), and keep the rest as opaque payload either way.
 */
public record SensorThingsObservation(
        Instant phenomenonTime,
        Instant resultTime,
        Object result,
        Map<String, Object> parameters,
        @JsonProperty("FeatureOfInterest") FeatureOfInterest featureOfInterest,
        @JsonProperty("Datastream") Datastream datastream) {

    public record FeatureOfInterest(GeoJsonPoint feature) {
    }

    public record Datastream(@JsonProperty("Thing") Thing thing) {
    }

    /** SensorThings' Thing entity represents the device; {@code iotId} is its {@code @iot.id}. */
    public record Thing(@JsonProperty("@iot.id") String iotId, String name) {
    }
}
