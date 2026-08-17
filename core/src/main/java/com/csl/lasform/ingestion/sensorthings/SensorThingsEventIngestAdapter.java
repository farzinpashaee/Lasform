package com.csl.lasform.ingestion.sensorthings;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.stereotype.Component;

import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.ingestion.EventIngestAdapter;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.enums.EventSource;
import com.csl.lasform.model.entity.enums.EventType;

@Component
public class SensorThingsEventIngestAdapter implements EventIngestAdapter<SensorThingsObservationBatch> {

    @Override
    public List<Event> adapt(SensorThingsObservationBatch batch) {
        return batch.value().stream().map(this::toEvent).toList();
    }

    private Event toEvent(SensorThingsObservation observation) {
        Map<String, Object> payload = new HashMap<>();
        Double speed = null;
        Double heading = null;
        Double accuracy = null;
        Double altitude = null;

        if (observation.result() instanceof Map<?, ?> result) {
            speed = numberField(result, "speed");
            heading = numberField(result, "heading");
            accuracy = numberField(result, "accuracy");
            altitude = numberField(result, "altitude");
            payload.putAll(stringKeyed(result));
        } else if (observation.result() != null) {
            payload.put("result", observation.result());
        }
        if (observation.parameters() != null) {
            payload.putAll(observation.parameters());
        }

        return Event.builder()
                .type(EventType.LOCATION_RECEIVED)
                .source(EventSource.DEVICE)
                .deviceId(deviceId(observation))
                .speed(speed)
                .heading(heading)
                .accuracy(accuracy)
                .altitude(altitude)
                .point(featurePoint(observation))
                .payload(payload)
                .occurredAt(occurredAt(observation))
                .build();
    }

    /** parameters.deviceId is a pragmatic extension — SensorThings itself only identifies the device via Datastream/Thing. */
    private String deviceId(SensorThingsObservation observation) {
        if (observation.parameters() != null && observation.parameters().get("deviceId") != null) {
            return String.valueOf(observation.parameters().get("deviceId"));
        }
        SensorThingsObservation.Thing thing = observation.datastream() == null ? null : observation.datastream().thing();
        if (thing == null) {
            return null;
        }
        return thing.name() != null ? thing.name() : thing.iotId();
    }

    private GeoJsonPoint featurePoint(SensorThingsObservation observation) {
        if (observation.featureOfInterest() == null || observation.featureOfInterest().feature() == null) {
            throw new BadRequestException("error.ingestion.geometryRequired");
        }
        return observation.featureOfInterest().feature();
    }

    private Instant occurredAt(SensorThingsObservation observation) {
        if (observation.phenomenonTime() != null) {
            return observation.phenomenonTime();
        }
        if (observation.resultTime() != null) {
            return observation.resultTime();
        }
        return Instant.now();
    }

    private Double numberField(Map<?, ?> map, String key) {
        Object value = map.get(key);
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private Map<String, Object> stringKeyed(Map<?, ?> map) {
        Map<String, Object> copy = new HashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            copy.put(String.valueOf(entry.getKey()), entry.getValue());
        }
        return copy;
    }
}
