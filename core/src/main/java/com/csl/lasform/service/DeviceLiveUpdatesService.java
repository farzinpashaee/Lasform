package com.csl.lasform.service;

import java.util.Set;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.csl.lasform.model.entity.Device;

/**
 * Fan-out for the device live-location SSE stream. {@link com.csl.lasform.ingestion.EventIngestionService}
 * calls {@link #publish} right after it persists a device's updated state; {@code DeviceLiveController}
 * calls {@link #subscribe} when a client opens the stream.
 */
public interface DeviceLiveUpdatesService {

    /** deviceIds is required and non-empty — there is no "subscribe to every device" mode. */
    void subscribe(SseEmitter emitter, Set<String> deviceIds);

    /** Pushes the given device to every open subscription whose deviceIds includes device.getId(). */
    void publish(Device device);
}
