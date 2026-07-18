package com.csl.lasform.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.enums.EventType;

public interface EventRepository extends MongoRepository<Event, String> {

    List<Event> findByDeviceIdOrderByOccurredAtDesc(String deviceId);

    List<Event> findByUserIdOrderByOccurredAtDesc(String userId);

    List<Event> findByTypeAndOccurredAtBetween(EventType type, Instant from, Instant to);
}
