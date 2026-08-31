package com.csl.lasform.auth.infrastructure.web.dto;

import jakarta.validation.constraints.NotBlank;

/** {@code accessToken} is the OAuth2 access token Google Identity Services hands back client-side. */
public record GoogleAuthRequest(@NotBlank(message = "{validation.auth.googleAccessToken.required}") String accessToken) {
}
