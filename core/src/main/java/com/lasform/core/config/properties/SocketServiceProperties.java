package com.lasform.core.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

import lombok.Data;

@Data
@Configuration
@PropertySource("classpath:application.properties")
@ConfigurationProperties(prefix = "lasform.socket-service")
public class SocketServiceProperties {

	private boolean enable = true;
	
	private int port = 8089;
	private int timeout = 2000;
	
	private int threadPoolCorePoolSize = 50 ;
	private int threadPoolMaxPoolSize = 300 ;
	private int threadPoolQueueCapacity = 50 ;
	

}
