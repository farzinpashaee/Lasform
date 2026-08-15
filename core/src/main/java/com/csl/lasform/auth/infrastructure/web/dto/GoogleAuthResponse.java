package com.csl.lasform.auth.infrastructure.web.dto;

/**
 * Flattened rather than nesting a {@link TokenResponse} — {@code pendingApproval} true means the
 * other four fields are simply absent from the JSON body, nothing more for the frontend to unwrap.
 */
public record GoogleAuthResponse(
        boolean pendingApproval, String accessToken, String refreshToken, String tokenType, Long expiresIn) {

    public static GoogleAuthResponse pending() {
        return new GoogleAuthResponse(true, null, null, null, null);
    }

    public static GoogleAuthResponse authenticated(TokenResponse tokens) {
        return new GoogleAuthResponse(false, tokens.accessToken(), tokens.refreshToken(), tokens.tokenType(), tokens.expiresIn());
    }
}
