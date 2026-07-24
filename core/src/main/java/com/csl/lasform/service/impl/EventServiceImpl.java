package com.csl.lasform.service.impl;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.enums.EventType;
import com.csl.lasform.repository.EventRepository;
import com.csl.lasform.service.EventService;

@Service
@Validated
public class EventServiceImpl extends AbstractCrudService<Event, String> implements EventService {

    private final EventRepository eventRepository;

    public EventServiceImpl(EventRepository eventRepository) {
        super(eventRepository);
        this.eventRepository = eventRepository;
    }

    @Override
    public List<Event> createAll(List<Event> entities) {
        return eventRepository.saveAll(entities);
    }

    @Override
    public List<Event> findByDeviceId(String deviceId) {
        return eventRepository.findByDeviceIdOrderByOccurredAtDesc(deviceId);
    }

    @Override
    public List<Event> findByUserId(String userId) {
        return eventRepository.findByUserIdOrderByOccurredAtDesc(userId);
    }

    @Override
    public List<Event> findByTypeAndOccurredAtBetween(EventType type, Instant from, Instant to) {
        return eventRepository.findByTypeAndOccurredAtBetween(type, from, to);
    }

    @Override
    protected void applyUpdate(Event existing, Event incoming) {
        existing.setType(incoming.getType());
        existing.setSource(incoming.getSource());
        existing.setDeviceId(incoming.getDeviceId());
        existing.setUserId(incoming.getUserId());
        existing.setPayload(incoming.getPayload());
        existing.setOccurredAt(incoming.getOccurredAt());
    }

    @Override
    protected String entityName() {
        return "Event";
    }
}
