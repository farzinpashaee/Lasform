package com.csl.lasform.ingestion;

import java.util.List;

import com.csl.lasform.model.entity.Event;

/**
 * Translates a device-pushed payload in some external wire format into this app's internal
 * {@link Event} model. Each supported protocol gets its own implementation (see the
 * {@code sensorthings}/{@code geojson} subpackages) — {@code EventIngestionController} exposes
 * one endpoint per adapter, and {@link EventIngestionService} handles what happens to the
 * translated events (persistence, device state sync) uniformly regardless of source format.
 *
 * @param <T> the wire-format request body this adapter accepts
 */
public interface EventIngestAdapter<T> {

    List<Event> adapt(T payload);
}
