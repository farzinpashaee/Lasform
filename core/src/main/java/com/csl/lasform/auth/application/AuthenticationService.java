package com.csl.lasform.auth.application;

import java.time.Instant;
import java.util.Set;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.csl.lasform.auth.domain.model.RefreshToken;
import com.csl.lasform.auth.domain.model.User;
import com.csl.lasform.auth.domain.model.UserStatus;
import com.csl.lasform.auth.domain.repository.RefreshTokenRepository;
import com.csl.lasform.auth.domain.repository.UserRepository;
import com.csl.lasform.auth.infrastructure.security.JwtService;
import com.csl.lasform.auth.infrastructure.security.RefreshTokenClaims;
import com.csl.lasform.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

/**
 * Login/refresh/password-reset. A {@link BadCredentialsException} here is deliberately not
 * caught locally — it's an {@code AuthenticationException} subtype, so it propagates past
 * DispatcherServlet to Spring Security's {@code ExceptionTranslationFilter}, which routes it to
 * the same {@code JsonAuthenticationEntryPoint} (401) used for missing/invalid tokens. That keeps
 * every 401 in the app going through one place.
 */
@Component
@RequiredArgsConstructor
public class AuthenticationService {

    private static final String INVALID_CREDENTIALS = "Invalid email or password.";
    private static final String INVALID_REFRESH_TOKEN = "Invalid or expired refresh token.";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PermissionResolutionService permissionResolutionService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResult login(String email, String rawPassword) {
        User user = userRepository
                .findByEmail(email)
                .filter(u -> passwordEncoder.matches(rawPassword, u.getPasswordHash()))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS));

        return issueTokens(user);
    }

    public AccessTokenResult refresh(String refreshTokenValue) {
        RefreshTokenClaims claims =
                jwtService.parseRefreshToken(refreshTokenValue).orElseThrow(() -> new BadCredentialsException(INVALID_REFRESH_TOKEN));

        RefreshToken record = refreshTokenRepository
                .findById(claims.refreshTokenId())
                .filter(rt -> !rt.isRevoked())
                .filter(rt -> rt.getExpiresAt().isAfter(Instant.now()))
                .filter(rt -> rt.getUserId().equals(claims.userId()))
                .orElseThrow(() -> new BadCredentialsException(INVALID_REFRESH_TOKEN));

        User user = userRepository
                .findById(record.getUserId())
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new BadCredentialsException(INVALID_REFRESH_TOKEN));

        Set<String> permissions = permissionResolutionService.resolveForUser(user.getId());
        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getOrgId(), permissions, user.isMustResetPassword(), user.getEmail(), user.getDisplayName());
        return new AccessTokenResult(accessToken, jwtService.getAccessTokenTtl().toSeconds());
    }

    public void resetPassword(String userId, String newRawPassword) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("error.user.notFound", userId));
        user.setPasswordHash(passwordEncoder.encode(newRawPassword));
        user.setMustResetPassword(false);
        userRepository.save(user);
    }

    private LoginResult issueTokens(User user) {
        Instant refreshExpiresAt = Instant.now().plus(jwtService.getRefreshTokenTtl());
        RefreshToken persisted = refreshTokenRepository.save(
                RefreshToken.builder().userId(user.getId()).expiresAt(refreshExpiresAt).revoked(false).build());

        Set<String> permissions = permissionResolutionService.resolveForUser(user.getId());
        String accessToken = jwtService.generateAccessToken(
                user.getId(), user.getOrgId(), permissions, user.isMustResetPassword(), user.getEmail(), user.getDisplayName());
        String refreshToken = jwtService.generateRefreshToken(user.getId(), persisted.getId(), refreshExpiresAt);

        return new LoginResult(accessToken, refreshToken, jwtService.getAccessTokenTtl().toSeconds());
    }
}
