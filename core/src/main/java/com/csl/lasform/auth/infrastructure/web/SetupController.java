package com.csl.lasform.auth.infrastructure.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.auth.application.LoginResult;
import com.csl.lasform.auth.application.SetupService;
import com.csl.lasform.auth.infrastructure.web.dto.CreateInitialAdminRequest;
import com.csl.lasform.auth.infrastructure.web.dto.SetupStatusResponse;
import com.csl.lasform.auth.infrastructure.web.dto.TokenResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * No {@code @PreAuthorize} on either endpoint — both must work for a caller with no token at all,
 * same reasoning as {@link AuthController}. The real gate is {@link SetupService#needsSetup()},
 * not a permission check: {@code createAdmin} throws once a first user already exists.
 */
@RestController
@RequestMapping("/api/setup")
@RequiredArgsConstructor
public class SetupController {

    private final SetupService setupService;

    @GetMapping("/status")
    public SetupStatusResponse status() {
        return new SetupStatusResponse(setupService.needsSetup());
    }

    /** Returns real tokens, exactly like {@code POST /api/auth/login} — the wizard logs the new admin straight in. */
    @PostMapping("/admin")
    public TokenResponse createAdmin(@Valid @RequestBody CreateInitialAdminRequest request) {
        LoginResult result = setupService.createInitialSuperAdmin(request.displayName(), request.email(), request.password());
        return TokenResponse.of(result.accessToken(), result.refreshToken(), result.expiresInSeconds());
    }
}
