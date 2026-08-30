package com.csl.lasform.service;

import java.time.Instant;
import java.util.List;

import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.enums.EventType;

public interface EventService extends CrudService<Event, String> {

    List<Event> createAll(List<Event> entities);

    List<Event> findByDeviceId(String deviceId);

    List<Event> findByUserId(String userId);

    List<Event> findByTypeAndOccurredAtBetween(EventType type, Instant from, Instant to);
}
