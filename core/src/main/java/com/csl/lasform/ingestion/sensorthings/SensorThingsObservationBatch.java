package com.csl.lasform.ingestion.sensorthings;

import java.util.List;

/**
 * Mirrors the OGC SensorThings API's own entity-collection response shape ({@code {"value": [...]}})
 * so a single Observation is still posted as a one-element {@code value} array, consistent with
 * how the protocol itself represents collections.
 */
public record SensorThingsObservationBatch(List<SensorThingsObservation> value) {
}
