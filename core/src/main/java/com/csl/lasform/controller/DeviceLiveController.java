package com.csl.lasform.controller;

import java.util.List;
import java.util.Set;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.csl.lasform.auth.infrastructure.security.StreamTicketService;
import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.service.DeviceLiveUpdatesService;

/**
 * Real-time device location/info updates over Server-Sent Events, for the map's "Live" tracking
 * feature. Kept separate from {@link DeviceController} — a streaming concern, not CRUD — the same
 * way ingestion adapters live apart from the entity controller they feed.
 *
 * <p>{@code EventSource} can't send an {@code Authorization} header, so opening the stream itself
 * is authenticated via a single-use ticket (see {@link StreamTicketService} and
 * {@link com.csl.lasform.auth.infrastructure.security.StreamTicketAuthenticationFilter}) minted
 * just beforehand by {@link #mintTicket}, which — unlike the stream endpoint — is always a normal
 * header-authenticated request.
 */
@RestController
@RequestMapping(DeviceLiveController.STREAM_PATH)
public class DeviceLiveController {

    public static final String STREAM_PATH = "/api/v1/devices/live";

    private final StreamTicketService streamTicketService;
    private final DeviceLiveUpdatesService deviceLiveUpdatesService;

    public DeviceLiveController(StreamTicketService streamTicketService, DeviceLiveUpdatesService deviceLiveUpdatesService) {
        this.streamTicketService = streamTicketService;
        this.deviceLiveUpdatesService = deviceLiveUpdatesService;
    }

    @PostMapping("/tickets")
    @PreAuthorize("hasAuthority('device:read')")
    public StreamTicketResponse mintTicket(Authentication authentication) {
        StreamTicketService.MintedTicket ticket = streamTicketService.mint(authentication);
        return new StreamTicketResponse(ticket.id(), ticket.expiresAt());
    }

    /** deviceIds is required — there is no "every device" mode, only ever the ones the caller is actually showing. */
    @GetMapping
    @PreAuthorize("hasAuthority('device:read')")
    public SseEmitter stream(@RequestParam(required = false) List<String> deviceIds) {
        if (deviceIds == null || deviceIds.isEmpty()) {
            throw new BadRequestException("error.device.liveDeviceIdsRequired");
        }
        SseEmitter emitter = new SseEmitter(0L);
        deviceLiveUpdatesService.subscribe(emitter, Set.copyOf(deviceIds));
        return emitter;
    }
}
