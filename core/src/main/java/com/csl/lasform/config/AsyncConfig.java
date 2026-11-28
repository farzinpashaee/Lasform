package com.csl.lasform.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Backs {@code @Async("ruleWebhookExecutor")} on {@code RuleWebhookSender} — the only thing in
 * the rule engine that can hang on a third party, so it's the only step pushed off the request
 * thread; everything else (condition evaluation, writing the in-app notification Alert) stays
 * synchronous since it's fast, local Mongo work.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean("ruleWebhookExecutor")
    public Executor ruleWebhookExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("rule-webhook-");
        executor.initialize();
        return executor;
    }
}
