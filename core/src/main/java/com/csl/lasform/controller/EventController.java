package com.csl.lasform.controller;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.ingestion.EventIngestionService;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.enums.EventType;
import com.csl.lasform.service.EventService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/events")
public class EventController extends AbstractCrudController<Event> {

    private final EventService eventService;
    private final EventIngestionService eventIngestionService;

    public EventController(EventService eventService, EventIngestionService eventIngestionService) {
        this.eventService = eventService;
        this.eventIngestionService = eventIngestionService;
    }

    @Override
    protected EventService service() {
        return eventService;
    }

    // See DeviceController for why the mapping annotation must be repeated on each override.

    @Override
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('event:read')")
    public Event getById(@PathVariable String id) {
        return super.getById(id);
    }

    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('event:read')")
    public Page<Event> list(Pageable pageable) {
        return super.list(pageable);
    }

    @Override
    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('event:write')")
    public Event update(@PathVariable String id, @RequestBody Event entity) {
        return super.update(id, entity);
    }

    @Override
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('event:write')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return super.delete(id);
    }

    // Deliberately no @PreAuthorize: events are ingested by devices (see the batch-array shape
    // below), not interactive users going through this JWT-based login — there's no permission
    // key for that in the given catalog, and gating it with a human permission would just break
    // real ingestion once devices are the actual caller. Left open for now; a device-credential
    // scheme is a separate piece of work.
    //
    // Routes through EventIngestionService (not eventService.createAll directly) so this endpoint
    // gets the same device-state sync (lastKnownPoint/lastSeenAt/batteryLevel) as the
    // SensorThings/GeoJSON adapters in EventIngestionController — see that class's javadoc.
    @PostMapping
    public ResponseEntity<List<Event>> create(@Valid @RequestBody List<Event> entities) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventIngestionService.ingest(entities));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('event:read')")
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
        throw new BadRequestException("error.event.filterRequired");
    }
}
