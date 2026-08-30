package com.csl.lasform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

// UserDetailsServiceAutoConfiguration is excluded because auth is JWT-based (SecurityConfig's
// filter chain populates the SecurityContext directly) — nothing here uses AuthenticationManager/
// UserDetailsService, so without this exclusion Boot would still stand up its default in-memory
// "user" account and log a spurious generated password on every startup.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class LasformApplication {

	public static void main(String[] args) {
		SpringApplication.run(LasformApplication.class, args);
	}

}
