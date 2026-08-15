package com.csl.lasform.auth.infrastructure.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.auth.application.AccessTokenResult;
import com.csl.lasform.auth.application.AuthenticationService;
import com.csl.lasform.auth.application.GoogleAuthResult;
import com.csl.lasform.auth.application.LoginResult;
import com.csl.lasform.auth.infrastructure.google.GoogleUserInfo;
import com.csl.lasform.auth.infrastructure.google.GoogleUserInfoClient;
import com.csl.lasform.auth.infrastructure.security.JwtPrincipal;
import com.csl.lasform.auth.infrastructure.web.dto.GoogleAuthRequest;
import com.csl.lasform.auth.infrastructure.web.dto.GoogleAuthResponse;
import com.csl.lasform.auth.infrastructure.web.dto.LoginRequest;
import com.csl.lasform.auth.infrastructure.web.dto.RefreshRequest;
import com.csl.lasform.auth.infrastructure.web.dto.ResetPasswordRequest;
import com.csl.lasform.auth.infrastructure.web.dto.TokenResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * No {@code @PreAuthorize} on any of these: login/refresh/google must work for a caller who isn't
 * authenticated yet, and reset-password must work for a caller whose only permission-gated
 * capability is that endpoint (see PasswordResetEnforcementFilter — it's what actually restricts
 * everything else while {@code mustResetPassword} is true, not a permission check here).
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authenticationService;
    private final GoogleUserInfoClient googleUserInfoClient;

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        LoginResult result = authenticationService.login(request.email(), request.password());
        return TokenResponse.of(result.accessToken(), result.refreshToken(), result.expiresInSeconds());
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        AccessTokenResult result = authenticationService.refresh(request.refreshToken());
        return TokenResponse.ofAccessOnly(result.accessToken(), result.expiresInSeconds());
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request, Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof JwtPrincipal principal)) {
            throw new BadCredentialsException("Authentication is required.");
        }
        authenticationService.resetPassword(principal.userId(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    /**
     * Backs both the "Sign in with Google" and "Sign up with Google" buttons — same request, same
     * response shape; see AuthenticationService#googleAuth for why the two flows collapse into one.
     */
    @PostMapping("/google")
    public GoogleAuthResponse google(@Valid @RequestBody GoogleAuthRequest request) {
        GoogleUserInfo info = googleUserInfoClient.fetchUserInfo(request.accessToken());
        GoogleAuthResult result = authenticationService.googleAuth(info);
        if (result.pendingApproval()) {
            return GoogleAuthResponse.pending();
        }
        LoginResult tokens = result.tokens();
        return GoogleAuthResponse.authenticated(TokenResponse.of(tokens.accessToken(), tokens.refreshToken(), tokens.expiresInSeconds()));
    }
}
