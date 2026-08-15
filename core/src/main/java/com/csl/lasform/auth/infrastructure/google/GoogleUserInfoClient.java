package com.csl.lasform.auth.infrastructure.google;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Turns a Google OAuth2 access token (obtained client-side via Google Identity Services'
 * {@code initTokenClient} — see AuthService on the frontend) into the caller's Google profile, by
 * asking Google itself. There's no local signature/JWKS verification here: a successful response
 * from this endpoint IS the proof the token is genuine and still valid — Google rejects
 * expired/revoked/malformed tokens with a 4xx before we'd ever see a body. This deliberately
 * doesn't check the token's audience against a configured client id (no {@code lasform.google.*}
 * config exists) — accepted simplification for a single-purpose app; see core/README.md.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GoogleUserInfoClient {

    private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
    private static final String INVALID_GOOGLE_TOKEN = "Could not verify the Google sign-in.";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public GoogleUserInfo fetchUserInfo(String accessToken) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(USERINFO_URL))
                .header("Authorization", "Bearer " + accessToken)
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.warn("Failed to reach Google's userinfo endpoint: {}", e.getMessage());
            throw new BadCredentialsException(INVALID_GOOGLE_TOKEN);
        }

        if (response.statusCode() != 200) {
            log.debug("Google rejected the access token (status {}): {}", response.statusCode(), response.body());
            throw new BadCredentialsException(INVALID_GOOGLE_TOKEN);
        }

        try {
            JsonNode body = objectMapper.readTree(response.body());
            return new GoogleUserInfo(
                    body.path("sub").asString(null),
                    body.path("email").asString(null),
                    body.path("email_verified").asBoolean(false),
                    body.path("name").asString(null),
                    body.path("picture").asString(null));
        } catch (RuntimeException e) {
            log.warn("Failed to parse Google's userinfo response: {}", e.getMessage());
            throw new BadCredentialsException(INVALID_GOOGLE_TOKEN);
        }
    }
}
