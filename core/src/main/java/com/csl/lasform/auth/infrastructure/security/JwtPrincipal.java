package com.csl.lasform.auth.infrastructure.security;

/**
 * The {@code Authentication#getPrincipal()} value for a request authenticated by a valid access
 * token — read back in controllers/services via {@code (JwtPrincipal) authentication.getPrincipal()}
 * (or {@link org.springframework.security.core.annotation.AuthenticationPrincipal}).
 */
public record JwtPrincipal(String userId, String orgId, boolean mustResetPassword) {
}
