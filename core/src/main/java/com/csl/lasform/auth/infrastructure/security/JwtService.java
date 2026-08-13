package com.csl.lasform.auth.infrastructure.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

/**
 * Issues and validates the two token types. Access tokens carry the resolved permission set
 * directly (so a request never needs a DB round-trip to authorize); refresh tokens carry only a
 * {@code jti} pointing at a {@link com.csl.lasform.auth.domain.model.RefreshToken} record, so they
 * can be revoked without waiting out their signature's validity.
 *
 * <p>Parsing methods never throw for a malformed/expired/wrong-type token — they return {@link
 * Optional#empty()}, per the "invalid JWT resolves to anonymous, not a hard rejection" rule (see
 * JwtAuthenticationFilter).
 */
@Slf4j
@Component
public class JwtService {

    private static final String CLAIM_ORG_ID = "orgId";
    private static final String CLAIM_PERMISSIONS = "permissions";
    private static final String CLAIM_MUST_RESET_PASSWORD = "mustResetPassword";
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_DISPLAY_NAME = "displayName";
    private static final String CLAIM_TYPE = "type";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    /** Deliberately no default — never hardcode a signing secret. Falls back to an ephemeral one if unset (see {@link #init()}). */
    @Value("${lasform.jwt.secret:}")
    private String configuredSecret;

    @Getter
    @Value("${lasform.jwt.access-token-ttl:15m}")
    private Duration accessTokenTtl;

    @Getter
    @Value("${lasform.jwt.refresh-token-ttl:7d}")
    private Duration refreshTokenTtl;

    private SecretKey key;

    @PostConstruct
    void init() {
        if (StringUtils.hasText(configuredSecret)) {
            key = Keys.hmacShaKeyFor(configuredSecret.getBytes(StandardCharsets.UTF_8));
            return;
        }
        key = Jwts.SIG.HS256.key().build();
        log.warn(
                "No lasform.jwt.secret configured — using an ephemeral, randomly generated signing "
                        + "key. Every token (access and refresh) will be invalidated the next time the "
                        + "app restarts. Set lasform.jwt.secret (LASFORM_JWT_SECRET) to a stable, "
                        + "at-least-32-character value for any deployment that needs to survive a restart.");
    }

    public String generateAccessToken(
            String userId, String orgId, Set<String> permissions, boolean mustResetPassword, String email, String displayName) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claim(CLAIM_ORG_ID, orgId)
                .claim(CLAIM_PERMISSIONS, List.copyOf(permissions))
                .claim(CLAIM_MUST_RESET_PASSWORD, mustResetPassword)
                .claim(CLAIM_EMAIL, email)
                .claim(CLAIM_DISPLAY_NAME, displayName)
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .signWith(key)
                .compact();
    }

    /** {@code refreshTokenId} is the id of the already-persisted {@code RefreshToken} record this token represents. */
    public String generateRefreshToken(String userId, String refreshTokenId, Instant expiresAt) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .id(refreshTokenId)
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
    }

    public Optional<AccessTokenClaims> parseAccessToken(String token) {
        return parse(token).filter(claims -> TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class))).map(claims -> {
            @SuppressWarnings("unchecked")
            Collection<String> permissions = claims.get(CLAIM_PERMISSIONS, Collection.class);
            boolean mustResetPassword = Boolean.TRUE.equals(claims.get(CLAIM_MUST_RESET_PASSWORD, Boolean.class));
            return new AccessTokenClaims(
                    claims.getSubject(),
                    claims.get(CLAIM_ORG_ID, String.class),
                    permissions == null ? Set.of() : Set.copyOf(permissions),
                    mustResetPassword,
                    claims.get(CLAIM_EMAIL, String.class),
                    claims.get(CLAIM_DISPLAY_NAME, String.class));
        });
    }

    public Optional<RefreshTokenClaims> parseRefreshToken(String token) {
        return parse(token)
                .filter(claims -> TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class)))
                .map(claims -> new RefreshTokenClaims(claims.getSubject(), claims.getId()));
    }

    private Optional<Claims> parse(String token) {
        try {
            return Optional.of(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Rejected an invalid/expired JWT: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
