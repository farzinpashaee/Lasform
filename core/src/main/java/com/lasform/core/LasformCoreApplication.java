package com.lasform.core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
// @EnableWebSecurity
@EnableJpaAuditing
public class LasformCoreApplication {

	public static void main(String[] args) {
		SpringApplication.run(LasformCoreApplication.class, args);
	}

}
