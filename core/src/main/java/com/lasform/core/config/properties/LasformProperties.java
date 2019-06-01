package com.lasform.core.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Data
@Configuration
@PropertySource("classpath:application.properties")
@ConfigurationProperties(prefix = "lasform.application")
public class LasformProperties {

    private boolean initialSampleData = false;
    private String applicationMode = "PUBLIC";
    private String webFaceUrl = "";

}
