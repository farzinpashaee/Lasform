package com.csl.lasform.ingestion.geojson;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.ingestion.EventIngestAdapter;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.enums.EventSource;
import com.csl.lasform.model.entity.enums.EventType;

@Component
public class GeoJsonEventIngestAdapter implements EventIngestAdapter<GeoJsonEventFeatureCollection> {

    @Override
    public List<Event> adapt(GeoJsonEventFeatureCollection featureCollection) {
        return featureCollection.features().stream().map(this::toEvent).toList();
    }

    private Event toEvent(GeoJsonEventFeature feature) {
        if (feature.geometry() == null) {
            throw new BadRequestException("error.ingestion.geometryRequired");
        }
        Map<String, Object> properties = feature.properties() == null ? Map.of() : feature.properties();

        return Event.builder()
                .type(EventType.LOCATION_RECEIVED)
                .source(EventSource.DEVICE)
                .deviceId(stringField(properties, "deviceId"))
                .speed(numberField(properties, "speed"))
                .heading(numberField(properties, "heading"))
                .accuracy(numberField(properties, "accuracy"))
                .altitude(numberField(properties, "altitude"))
                .point(feature.geometry())
                .payload(new HashMap<>(properties))
                .occurredAt(occurredAt(properties))
                .build();
    }

    private Instant occurredAt(Map<String, Object> properties) {
        Object timestamp = properties.get("timestamp");
        if (timestamp instanceof String text) {
            try {
                return Instant.parse(text);
            } catch (DateTimeParseException ignored) {
                // Falls through to "now" below — a malformed timestamp shouldn't drop the reading.
            }
        }
        return Instant.now();
    }

    private String stringField(Map<String, Object> properties, String key) {
        Object value = properties.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private Double numberField(Map<String, Object> properties, String key) {
        Object value = properties.get(key);
        return value instanceof Number number ? number.doubleValue() : null;
    }
}
