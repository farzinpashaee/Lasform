package com.csl.lasform.auth.infrastructure.security;

import java.io.IOException;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * While a user's {@code mustResetPassword} is true, their access token is otherwise fully valid
 * (it carries their real permissions — see JwtService), but every request except the handful
 * needed to actually reset the password is blocked here, in one place, rather than re-checked in
 * every controller.
 */
@Component
@RequiredArgsConstructor
public class PasswordResetEnforcementFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_PATHS = Set.of("/api/auth/login", "/api/auth/refresh", "/api/auth/reset-password");

    private final SecurityErrorResponseWriter responseWriter;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof JwtPrincipal principal
                && principal.mustResetPassword()
                && !ALLOWED_PATHS.contains(request.getRequestURI())) {
            responseWriter.write(
                    response,
                    HttpStatus.FORBIDDEN,
                    "password_reset_required",
                    "This account must reset its password before doing anything else — POST /api/auth/reset-password.");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
