package com.csl.lasform.auth.infrastructure.google;

/** The subset of Google's OIDC userinfo response this app actually uses. */
public record GoogleUserInfo(String subject, String email, boolean emailVerified, String name, String picture) {
}
