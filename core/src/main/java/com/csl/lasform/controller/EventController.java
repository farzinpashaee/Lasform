package com.csl.lasform.controller;

import java.time.Instant;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.enums.EventType;
import com.csl.lasform.service.EventService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/events")
public class EventController extends AbstractCrudController<Event> {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @Override
    protected EventService service() {
        return eventService;
    }

    // Events are ingested in batches (e.g. a device flushing queued location
    // pings), so unlike the other entities this accepts a JSON array rather
    // than a single object; see AbstractCrudController.createOne.
    @PostMapping
    public ResponseEntity<List<Event>> create(@Valid @RequestBody List<Event> entities) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.createAll(entities));
    }

    @GetMapping("/search")
    public List<Event> search(
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) EventType type,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE_TIME) Instant to) {
        if (deviceId != null) {
            return eventService.findByDeviceId(deviceId);
        }
        if (userId != null) {
            return eventService.findByUserId(userId);
        }
        if (type != null && from != null && to != null) {
            return eventService.findByTypeAndOccurredAtBetween(type, from, to);
        }
        throw new IllegalArgumentException(
                "Provide 'deviceId', 'userId', or 'type' together with 'from' and 'to'");
    }
}
