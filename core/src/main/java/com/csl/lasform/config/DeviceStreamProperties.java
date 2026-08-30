package com.csl.lasform.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

/**
 * Environment-configured defaults for the device live-location SSE stream (see
 * {@code DeviceLiveController}/{@code StreamTicketService}).
 */
@Component
@ConfigurationProperties(prefix = "lasform.stream")
@Getter
@Setter
public class DeviceStreamProperties {

    /** How long a minted, single-use SSE connection ticket remains valid before it's discarded unused. */
    private Duration ticketTtl = Duration.ofSeconds(30);

    /** How often a keep-alive comment is sent to each open SSE connection. */
    private Duration heartbeatInterval = Duration.ofSeconds(20);
}
