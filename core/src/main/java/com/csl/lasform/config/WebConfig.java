package com.csl.lasform.config;

import com.csl.lasform.interceptor.RequestLoggingInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the Angular dev server (a different origin) to call the API directly, since
 * LasformWebFace's environment.apiUrl points at this backend's absolute URL rather than going
 * through a same-origin proxy. A production/demo deployment serves both from the same origin
 * (see the Dockerfile — one jar) so the browser doesn't strictly need CORS for it, but it still
 * sends an Origin header on non-GET requests, and Spring's CorsProcessor rejects ANY origin not
 * in this list outright (403 "Invalid CORS request") rather than only checking cross-origin
 * calls — so every deployment origin has to be listed here, not just ones that are genuinely
 * cross-origin.
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final RequestLoggingInterceptor requestLoggingInterceptor;

    /**
     * Comma-separated list of allowed origins. Defaults to just the Angular dev server; a
     * deployed instance adds its own origin(s) here, e.g. {@code https://lasform.codestreamlab.com}.
     */
    @Value("${lasform.cors.allowed-origins:http://localhost:4200}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.split("\\s*,\\s*"))
                .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE");
        // Actuator endpoints (e.g. /actuator/info, read by the map page's "About" panel) are
        // dispatched through their own HandlerMapping, not the RequestMappingHandlerMapping this
        // CorsRegistry configures — a mapping here for "/actuator/**" would silently do nothing.
        // Their CORS is configured separately via management.endpoints.web.cors in application.yml.
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(requestLoggingInterceptor);
    }
}
