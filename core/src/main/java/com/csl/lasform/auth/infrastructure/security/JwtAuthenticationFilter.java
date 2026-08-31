package com.csl.lasform.auth.infrastructure.security;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * Reads {@code Authorization: Bearer <token>}. A present-and-valid access token becomes the
 * request's {@link Authentication}, with {@link JwtPrincipal} as its principal and the token's
 * permission keys as authorities.
 *
 * <p>A missing or invalid (malformed/expired/wrong-type) token is deliberately <em>not</em>
 * rejected here — this filter just leaves the SecurityContext unset, and
 * {@code AnonymousAuthenticationFilter} (configured in SecurityConfig with the ANONYMOUS role's
 * authorities) fills it in afterwards. That's what lets
 * {@code @PreAuthorize("hasAuthority('map:view_public')")} work the same for anonymous and
 * authenticated callers, with no special-cased anonymous branch anywhere else.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            jwtService.parseAccessToken(token).ifPresent(claims -> {
                JwtPrincipal principal = new JwtPrincipal(claims.userId(), claims.orgId(), claims.mustResetPassword());
                List<SimpleGrantedAuthority> authorities =
                        claims.permissions().stream().map(SimpleGrantedAuthority::new).toList();
                Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            });
        }
        filterChain.doFilter(request, response);
    }
}
