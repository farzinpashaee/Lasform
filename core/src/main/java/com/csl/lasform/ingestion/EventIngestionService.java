package com.csl.lasform.ingestion;

import java.util.List;

import org.springframework.stereotype.Service;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.repository.DeviceRepository;
import com.csl.lasform.service.EventService;

/**
 * What happens to a batch of {@link Event}s once some {@link EventIngestAdapter} has translated
 * them from whatever wire format a device used — shared by every adapter so this logic exists
 * exactly once regardless of source protocol.
 */
@Service
public class EventIngestionService {

    private final EventService eventService;
    private final DeviceRepository deviceRepository;

    public EventIngestionService(EventService eventService, DeviceRepository deviceRepository) {
        this.eventService = eventService;
        this.deviceRepository = deviceRepository;
    }

    public List<Event> ingest(List<Event> events) {
        List<Event> saved = eventService.createAll(events);
        saved.forEach(this::syncDeviceState);
        return saved;
    }

    /**
     * Best-effort: an event with no deviceId, or one that doesn't match a registered Device
     * (event.deviceId is deliberately not FK-enforced), simply doesn't update anything. Within a
     * batch, later events for the same device overwrite earlier ones — last reading wins.
     */
    private void syncDeviceState(Event event) {
        if (event.getDeviceId() == null) {
            return;
        }
        deviceRepository.findByDeviceIdentifier(event.getDeviceId()).ifPresent(device -> {
            device.setLastKnownPoint(event.getPoint());
            device.setLastSeenAt(event.getOccurredAt());
            batteryLevel(event, device);
            deviceRepository.save(device);
        });
    }

    private void batteryLevel(Event event, Device device) {
        Object batteryLevel = event.getPayload() == null ? null : event.getPayload().get("batteryLevel");
        if (batteryLevel instanceof Number number) {
            device.setBatteryLevel(number.intValue());
        }
    }
}
