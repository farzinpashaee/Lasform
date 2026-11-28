package com.csl.lasform.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

/** Environment-configured defaults for the rule engine's webhook action (see {@code RuleWebhookSender}). */
@Component
@ConfigurationProperties(prefix = "lasform.rules")
@Getter
@Setter
public class RuleEngineProperties {

    /** Connect + read timeout for a rule's outbound webhook call — a slow/unresponsive third party gives up after this. */
    private Duration webhookTimeout = Duration.ofSeconds(5);
}
