package com.csl.lasform.auth.infrastructure.security;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * 401 for missing/invalid authentication. Spring Security routes here for two distinct cases,
 * both correctly: an {@code @PreAuthorize} check failing for a caller who resolved to the
 * anonymous authority (no/invalid JWT — see JwtAuthenticationFilter), and an
 * {@code AuthenticationException} (e.g. bad login credentials) thrown from anywhere, including
 * directly from a controller.
 */
@Component
@RequiredArgsConstructor
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final SecurityErrorResponseWriter responseWriter;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        String message = authException.getMessage() != null
                ? authException.getMessage()
                : "Authentication is required and was missing or invalid.";
        responseWriter.write(response, HttpStatus.UNAUTHORIZED, "unauthorized", message);
    }
}
