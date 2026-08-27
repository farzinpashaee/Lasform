package com.csl.lasform.auth.infrastructure.security;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.csl.lasform.config.DeviceStreamProperties;

/**
 * Mints short-lived, single-use tickets that stand in for a real bearer token when opening the
 * device live-location SSE stream — {@code EventSource} can't send an {@code Authorization}
 * header, and a real (15-minute) access token has no business sitting in a URL, where it can land
 * in access logs, browser history, or a Referer header. A ticket is minted via a normal,
 * header-authenticated request (so whatever {@link Authentication} that request already carries
 * is exactly what gets stored — no need to re-resolve permissions), then consumed exactly once by
 * {@link StreamTicketAuthenticationFilter} when the stream connection actually opens.
 *
 * <p>In-memory and single-node: fine for this app's single-instance deployment, but a multi-node
 * deployment would need a shared store (e.g. Redis) instead — a ticket minted on one instance
 * wouldn't be visible to another.
 */
@Component
public class StreamTicketService {

    private final DeviceStreamProperties properties;
    private final ConcurrentMap<String, Ticket> ticketsById = new ConcurrentHashMap<>();

    public StreamTicketService(DeviceStreamProperties properties) {
        this.properties = properties;
    }

    private record Ticket(Authentication authentication, Instant expiresAt) {
        boolean isExpired() {
            return expiresAt.isBefore(Instant.now());
        }
    }

    public record MintedTicket(String id, Instant expiresAt) {
    }

    public MintedTicket mint(Authentication authentication) {
        sweepExpired();
        String id = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(properties.getTicketTtl());
        ticketsById.put(id, new Ticket(authentication, expiresAt));
        return new MintedTicket(id, expiresAt);
    }

    /** Single-use: the ticket is removed whether or not it turns out to still be valid. */
    public Optional<Authentication> consume(String ticketId) {
        Ticket ticket = ticketsById.remove(ticketId);
        if (ticket == null || ticket.isExpired()) {
            return Optional.empty();
        }
        return Optional.of(ticket.authentication());
    }

    private void sweepExpired() {
        ticketsById.values().removeIf(Ticket::isExpired);
    }
}
