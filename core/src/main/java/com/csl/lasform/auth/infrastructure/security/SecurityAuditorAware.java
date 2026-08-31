package com.csl.lasform.auth.infrastructure.security;

import java.util.Optional;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Feeds {@code @CreatedBy}/{@code @LastModifiedBy} (see {@code Auditable}) from the current
 * request's JWT principal. Empty for anonymous callers and for code that runs with no security
 * context at all (e.g. AuthSeeder's bootstrap run), which leaves those fields {@code null} rather
 * than a placeholder string — {@link com.csl.lasform.config.MongoConfig} wires this up via
 * {@code @EnableMongoAuditing}.
 */
@Component
public class SecurityAuditorAware implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtPrincipal principal)) {
            return Optional.empty();
        }
        return Optional.of(principal.userId());
    }
}
