package com.csl.lasform.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

import com.csl.lasform.auth.application.PermissionResolutionService;
import com.csl.lasform.auth.domain.model.SystemRoleName;
import com.csl.lasform.auth.infrastructure.security.JsonAccessDeniedHandler;
import com.csl.lasform.auth.infrastructure.security.JsonAuthenticationEntryPoint;
import com.csl.lasform.auth.infrastructure.security.JwtAuthenticationFilter;
import com.csl.lasform.auth.infrastructure.security.PasswordResetEnforcementFilter;
import com.csl.lasform.auth.infrastructure.security.StreamTicketAuthenticationFilter;

import lombok.RequiredArgsConstructor;

/**
 * Stateless, JWT-based. There is deliberately no {@code .authenticated()} URL rule anywhere —
 * every request is {@code permitAll()} at this layer, and actual authorization happens entirely
 * via {@code @PreAuthorize("hasAuthority('...')")} on individual controller methods (see
 * AbstractCrudController subclasses). A request with no/invalid JWT still gets a real
 * {@code Authentication} (Spring's built-in anonymous filter, configured below with the
 * ANONYMOUS role's permissions), so {@code hasAuthority('map:view_public')} evaluates identically
 * for anonymous and authenticated callers — see JwtAuthenticationFilter's javadoc for why that
 * also means Spring Security's normal 401-vs-403 split (anonymous + denied → 401 via
 * JsonAuthenticationEntryPoint, authenticated + denied → 403 via JsonAccessDeniedHandler) falls
 * out of {@code ExceptionTranslationFilter} for free, with no custom logic needed here.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
// AuthSeeder must have already seeded the ANONYMOUS role + its permissions (its @PostConstruct)
// before anonymousAuthorities() below queries them — both run during context refresh, so without
// this the order between them would otherwise be undefined.
@DependsOn("authSeeder")
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final StreamTicketAuthenticationFilter streamTicketAuthenticationFilter;
    private final PasswordResetEnforcementFilter passwordResetEnforcementFilter;
    private final JsonAuthenticationEntryPoint authenticationEntryPoint;
    private final JsonAccessDeniedHandler accessDeniedHandler;
    private final PermissionResolutionService permissionResolutionService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .anonymous(anon -> anon.authorities(anonymousAuthorities()))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authenticationEntryPoint).accessDeniedHandler(accessDeniedHandler))
                // jwtAuthenticationFilter's position must be registered before it can be used as
                // a reference point below — addFilterBefore(X, SomeFilter.class) requires
                // SomeFilter to already have a known order in this chain.
                .addFilterBefore(jwtAuthenticationFilter, AnonymousAuthenticationFilter.class)
                .addFilterBefore(streamTicketAuthenticationFilter, JwtAuthenticationFilter.class)
                .addFilterAfter(passwordResetEnforcementFilter, AnonymousAuthenticationFilter.class);
        return http.build();
    }

    private List<GrantedAuthority> anonymousAuthorities() {
        return permissionResolutionService.resolveForRoleName(SystemRoleName.ANONYMOUS.name()).stream()
                .<GrantedAuthority>map(SimpleGrantedAuthority::new)
                .toList();
    }
}
