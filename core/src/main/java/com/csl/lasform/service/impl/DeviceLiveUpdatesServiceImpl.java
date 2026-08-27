package com.csl.lasform.service.impl;

import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.csl.lasform.config.DeviceStreamProperties;
import com.csl.lasform.model.entity.Device;
import com.csl.lasform.service.DeviceLiveUpdatesService;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

/**
 * In-memory, single-node subscriber registry — fine for this app's single-instance deployment,
 * but a multi-node deployment would need per-device fan-out across instances (e.g. a Mongo change
 * stream or a broker) since a subscription registered on one instance is invisible to another.
 */
@Service
public class DeviceLiveUpdatesServiceImpl implements DeviceLiveUpdatesService {

    private static final String EVENT_NAME = "device-update";

    private final DeviceStreamProperties properties;
    private final CopyOnWriteArrayList<Subscription> subscriptions = new CopyOnWriteArrayList<>();
    private ScheduledExecutorService heartbeatExecutor;

    private record Subscription(SseEmitter emitter, Set<String> deviceIds) {
    }

    public DeviceLiveUpdatesServiceImpl(DeviceStreamProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void startHeartbeat() {
        heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "device-live-heartbeat");
            thread.setDaemon(true);
            return thread;
        });
        long intervalMillis = properties.getHeartbeatInterval().toMillis();
        heartbeatExecutor.scheduleAtFixedRate(this::sendHeartbeat, intervalMillis, intervalMillis, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    void stopHeartbeat() {
        heartbeatExecutor.shutdownNow();
    }

    @Override
    public void subscribe(SseEmitter emitter, Set<String> deviceIds) {
        Subscription subscription = new Subscription(emitter, deviceIds);
        subscriptions.add(subscription);
        Runnable remove = () -> subscriptions.remove(subscription);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(throwable -> remove.run());
    }

    @Override
    public void publish(Device device) {
        if (device.getId() == null) {
            return;
        }
        for (Subscription subscription : subscriptions) {
            if (!subscription.deviceIds().contains(device.getId())) {
                continue;
            }
            try {
                subscription.emitter().send(SseEmitter.event().name(EVENT_NAME).data(device));
            } catch (Exception e) {
                subscriptions.remove(subscription);
                subscription.emitter().completeWithError(e);
            }
        }
    }

    private void sendHeartbeat() {
        for (Subscription subscription : subscriptions) {
            try {
                subscription.emitter().send(SseEmitter.event().comment("heartbeat"));
            } catch (Exception e) {
                subscriptions.remove(subscription);
                subscription.emitter().completeWithError(e);
            }
        }
    }
}
