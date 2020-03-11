package com.lasform.core.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.service.Contact;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import static springfox.documentation.builders.PathSelectors.regex;

@Configuration
@EnableSwagger2
public class SwaggerConfig {

    private static final Set<String> DEFAULT_PRODUCE_AND_CONSUME =
            new HashSet<String>(Arrays.asList("application/json","application/xml"));

    @Bean
    public Docket lasformApi() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(metaData())
                .produces(DEFAULT_PRODUCE_AND_CONSUME)
                .consumes(DEFAULT_PRODUCE_AND_CONSUME)
                .select().apis(RequestHandlerSelectors.basePackage("com.lasform.core.business.controller"))
                .paths(regex("/api/.*"))
                .build();
    }

    private ApiInfo metaData() {
        return new ApiInfoBuilder()
                .title("Lasform REST API")
                .description("Location Base Open Source Platform")
                .version("1.0.0")
                .license("Open Source")
                .contact(new Contact("Lasform", "http://lasform.ir/", "info@lasform.ir"))
                .build();
    }

}
