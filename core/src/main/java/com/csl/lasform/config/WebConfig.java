package com.csl.lasform.config;

import com.csl.lasform.interceptor.RequestLoggingInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the Angular dev server (a different origin) to call the API directly,
 * since LasformWebFace's environment.apiUrl points at this backend's absolute URL
 * rather than going through a same-origin proxy.
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final RequestLoggingInterceptor requestLoggingInterceptor;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:4200")
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
