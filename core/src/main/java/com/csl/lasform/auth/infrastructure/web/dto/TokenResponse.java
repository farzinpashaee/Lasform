package com.csl.lasform.auth.infrastructure.web.dto;

/** Shared response shape for login (both tokens present) and refresh (refreshToken null). */
public record TokenResponse(String accessToken, String refreshToken, String tokenType, long expiresIn) {

    public static TokenResponse of(String accessToken, String refreshToken, long expiresIn) {
        return new TokenResponse(accessToken, refreshToken, "Bearer", expiresIn);
    }

    public static TokenResponse ofAccessOnly(String accessToken, long expiresIn) {
        return new TokenResponse(accessToken, null, "Bearer", expiresIn);
    }
}
