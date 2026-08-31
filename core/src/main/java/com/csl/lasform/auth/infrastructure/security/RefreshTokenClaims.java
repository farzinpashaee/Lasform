package com.csl.lasform.auth.infrastructure.security;

/** {@code refreshTokenId} is the {@link com.csl.lasform.auth.domain.model.RefreshToken#getId()} it was issued for. */
public record RefreshTokenClaims(String userId, String refreshTokenId) {
}
