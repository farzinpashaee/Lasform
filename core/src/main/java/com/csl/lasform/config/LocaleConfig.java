package com.csl.lasform.config;

import java.util.List;
import java.util.Locale;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

/**
 * Resolves the request locale from the {@code Accept-Language} header rather than a session/cookie,
 * since this is a stateless REST API. Only English ships today; adding a locale is a matter of
 * dropping in {@code messages_xx.properties}/{@code ValidationMessages_xx.properties} and listing
 * it below — no other code changes needed.
 */
@Configuration
public class LocaleConfig {

    private static final List<Locale> SUPPORTED_LOCALES = List.of(Locale.ENGLISH);

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(Locale.ENGLISH);
        resolver.setSupportedLocales(SUPPORTED_LOCALES);
        return resolver;
    }
}
