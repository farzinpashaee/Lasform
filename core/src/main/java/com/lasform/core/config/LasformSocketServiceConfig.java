package com.lasform.core.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import com.lasform.core.config.properties.SocketServiceProperties;

@Configuration
public class LasformSocketServiceConfig {
	
	public static final int TYPE_TAG_SIZE = 2;
	public static final int LENGTH_TAG_SIZE = 4;
	public static final int IDENTIFIER_TAG_SIZE = 10;

	public static final int LENGTH_TAG_END_INDEX = LENGTH_TAG_SIZE + TYPE_TAG_SIZE;
	public static final int IDENTIFIER_TAG_END_INDEX = IDENTIFIER_TAG_SIZE + LENGTH_TAG_END_INDEX;
	
	public static final int LOCATION_SERIES_DATA_SEGMENT_LENGTH = 20;
	
	@Autowired
	SocketServiceProperties threadPoolProperties;

	@Bean 
	public TaskExecutor getAsyncExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(threadPoolProperties.getThreadPoolCorePoolSize());
		executor.setMaxPoolSize(threadPoolProperties.getThreadPoolMaxPoolSize());
		executor.setQueueCapacity(threadPoolProperties.getThreadPoolQueueCapacity());
		executor.setThreadNamePrefix("socketThreadPoolExecutor-");
		executor.initialize();
		return executor;
	}

}
