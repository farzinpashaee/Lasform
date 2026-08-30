package com.csl.lasform.auth.application;

public record AccessTokenResult(String accessToken, long expiresInSeconds) {
}
