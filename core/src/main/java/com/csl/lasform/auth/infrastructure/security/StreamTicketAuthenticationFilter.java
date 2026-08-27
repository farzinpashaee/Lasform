package com.csl.lasform.auth.infrastructure.security;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.csl.lasform.controller.DeviceLiveController;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * Authenticates the device live-location SSE stream request via a single-use ticket (see
 * {@link StreamTicketService}) instead of a header, since {@code EventSource} can't send one.
 * Scoped tightly on purpose: only acts when there's no {@code Authorization} header, a
 * {@code ticket} query parameter is present, and the request is exactly
 * {@link DeviceLiveController#STREAM_PATH} — every other endpoint, including the ticket-minting
 * one, is completely unaffected by this filter and keeps using header-based JWT auth as normal.
 *
 * <p>A missing/expired/already-consumed ticket is deliberately <em>not</em> rejected here — same
 * as {@link JwtAuthenticationFilter}, this just leaves the SecurityContext unset and lets
 * {@code AnonymousAuthenticationFilter} fill it in, so the request fails closed via
 * {@code @PreAuthorize("hasAuthority('device:read')")} with a normal 401, not a special case.
 */
@Component
@RequiredArgsConstructor
public class StreamTicketAuthenticationFilter extends OncePerRequestFilter {

    private final StreamTicketService streamTicketService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String ticket = request.getParameter("ticket");
        boolean hasAuthorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION) != null;
        if (!hasAuthorizationHeader && ticket != null && DeviceLiveController.STREAM_PATH.equals(request.getRequestURI())) {
            streamTicketService.consume(ticket)
                    .ifPresent(authentication -> SecurityContextHolder.getContext().setAuthentication(authentication));
        }
        filterChain.doFilter(request, response);
    }
}
