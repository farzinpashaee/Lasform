package com.csl.lasform.service.impl;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.csl.lasform.config.RuleEngineProperties;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.RuleAction;
import com.csl.lasform.service.RuleWebhookSender;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

/**
 * Single-attempt, fire-and-forget delivery of a rule's WEBHOOK action — no retry queue exists in
 * this codebase (no message broker), so a failure is logged and dropped, same bar the action's
 * own javadoc sets. Uses the JDK's own {@link HttpClient} rather than Spring's RestClient/WebClient,
 * matching this codebase's one other outbound HTTP caller (see GoogleUserInfoClient).
 */
@Slf4j
@Service
public class RuleWebhookSenderImpl implements RuleWebhookSender {

    private static final String SIGNATURE_HEADER = "X-Lasform-Signature";
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final Duration requestTimeout;

    public RuleWebhookSenderImpl(ObjectMapper objectMapper, RuleEngineProperties properties) {
        this.objectMapper = objectMapper;
        this.requestTimeout = properties.getWebhookTimeout();
        this.httpClient = HttpClient.newBuilder().connectTimeout(requestTimeout).build();
    }

    @Override
    @Async("ruleWebhookExecutor")
    public void sendAsync(RuleAction action, Event event) {
        if (action.getWebhookUrl() == null || action.getWebhookUrl().isBlank()) {
            log.warn("Skipping webhook action with no webhookUrl (event {})", event.getId());
            return;
        }
        String body = objectMapper.writeValueAsString(event);
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(action.getWebhookUrl()))
                .timeout(requestTimeout)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));

        for (Map.Entry<String, String> header : action.getWebhookHeaders().entrySet()) {
            requestBuilder.header(header.getKey(), header.getValue());
        }
        if (action.getWebhookSecret() != null && !action.getWebhookSecret().isBlank()) {
            requestBuilder.header(SIGNATURE_HEADER, sign(body, action.getWebhookSecret()));
        }

        try {
            HttpResponse<String> response =
                    httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn(
                        "Rule webhook to {} returned status {} for event {}",
                        action.getWebhookUrl(), response.statusCode(), event.getId());
            }
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.warn("Rule webhook to {} failed for event {}: {}", action.getWebhookUrl(), event.getId(), e.getMessage());
        }
    }

    private String sign(String body, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] signature = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(signature);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            // HmacSHA256 is a standard JDK algorithm and the key is always non-empty text — this
            // branch is unreachable in practice, but Mac's checked exceptions require handling it.
            throw new IllegalStateException("Failed to sign webhook payload", e);
        }
    }
}
