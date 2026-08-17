package com.csl.lasform.ingestion.geojson;

import java.util.Map;

import org.springframework.data.mongodb.core.geo.GeoJsonPoint;

/**
 * A single device-reported point: standard GeoJSON Feature shape, with the device/telemetry
 * fields (deviceId, timestamp, speed, heading, accuracy, altitude, batteryLevel) read out of the
 * free-form {@code properties} bag, which is where GeoJSON itself puts anything non-geometric.
 */
public record GeoJsonEventFeature(String type, GeoJsonPoint geometry, Map<String, Object> properties) {
}
