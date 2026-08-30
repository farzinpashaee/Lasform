package com.csl.lasform.auth.application;

public record LoginResult(String accessToken, String refreshToken, long expiresInSeconds) {
}
