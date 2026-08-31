package com.csl.lasform.ingestion;

import java.util.List;

import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Service;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.repository.DeviceRepository;
import com.csl.lasform.service.DeviceLiveUpdatesService;
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
    private final AuditorAware<String> auditorAware;
    private final DeviceLiveUpdatesService deviceLiveUpdatesService;

    public EventIngestionService(
            EventService eventService,
            DeviceRepository deviceRepository,
            AuditorAware<String> auditorAware,
            DeviceLiveUpdatesService deviceLiveUpdatesService) {
        this.eventService = eventService;
        this.deviceRepository = deviceRepository;
        this.auditorAware = auditorAware;
        this.deviceLiveUpdatesService = deviceLiveUpdatesService;
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
            // Spring Data's auditing only *sets* @LastModifiedBy when an auditor is present — it
            // never clears a field for an absent one, so a device whose only prior write was an
            // authenticated admin edit would otherwise keep that admin's id as updatedBy forever,
            // even though this write (device telemetry, almost always anonymous) isn't theirs.
            // Setting it explicitly here means an absent auditor actually lands as null.
            device.setUpdatedBy(auditorAware.getCurrentAuditor().orElse(null));
            deviceRepository.save(device);
            deviceLiveUpdatesService.publish(device);
        });
    }

    private void batteryLevel(Event event, Device device) {
        Object batteryLevel = event.getPayload() == null ? null : event.getPayload().get("batteryLevel");
        if (batteryLevel instanceof Number number) {
            device.setBatteryLevel(number.intValue());
        }
    }
}
