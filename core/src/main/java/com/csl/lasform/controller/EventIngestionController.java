package com.csl.lasform.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.ingestion.EventIngestionService;
import com.csl.lasform.ingestion.geojson.GeoJsonEventFeatureCollection;
import com.csl.lasform.ingestion.geojson.GeoJsonEventIngestAdapter;
import com.csl.lasform.ingestion.sensorthings.SensorThingsEventIngestAdapter;
import com.csl.lasform.ingestion.sensorthings.SensorThingsObservationBatch;
import com.csl.lasform.model.entity.Event;

/**
 * Format-specific ingestion endpoints alongside the raw {@code POST /api/v1/events} in {@link
 * EventController} — same deliberately-open access (see that class's comment: devices have no
 * credential scheme yet), just accepting OGC SensorThings and GeoJSON payloads instead of this
 * app's internal Event shape. Each endpoint is a thin adapt-then-ingest pipeline; see {@link
 * com.csl.lasform.ingestion.EventIngestAdapter} for the translation and {@link
 * EventIngestionService} for what happens afterward (persistence + device state sync).
 */
@RestController
@RequestMapping("/api/v1/events")
public class EventIngestionController {

    private final SensorThingsEventIngestAdapter sensorThingsAdapter;
    private final GeoJsonEventIngestAdapter geoJsonAdapter;
    private final EventIngestionService ingestionService;

    public EventIngestionController(
            SensorThingsEventIngestAdapter sensorThingsAdapter,
            GeoJsonEventIngestAdapter geoJsonAdapter,
            EventIngestionService ingestionService) {
        this.sensorThingsAdapter = sensorThingsAdapter;
        this.geoJsonAdapter = geoJsonAdapter;
        this.ingestionService = ingestionService;
    }

    @PostMapping("/sensorthings")
    public ResponseEntity<List<Event>> ingestSensorThings(@RequestBody SensorThingsObservationBatch batch) {
        List<Event> events = ingestionService.ingest(sensorThingsAdapter.adapt(batch));
        return ResponseEntity.status(HttpStatus.CREATED).body(events);
    }

    @PostMapping("/geojson")
    public ResponseEntity<List<Event>> ingestGeoJson(@RequestBody GeoJsonEventFeatureCollection featureCollection) {
        List<Event> events = ingestionService.ingest(geoJsonAdapter.adapt(featureCollection));
        return ResponseEntity.status(HttpStatus.CREATED).body(events);
    }
}
