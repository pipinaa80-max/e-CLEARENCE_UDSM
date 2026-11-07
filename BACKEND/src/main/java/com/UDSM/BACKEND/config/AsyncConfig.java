package com.UDSM.BACKEND.config;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
@Slf4j
public class AsyncConfig {

    /**
     * High-throughput managed ThreadPoolTaskExecutor.
     * Prevents thread exhaustion and OutOfMemoryError under heavy concurrent loads.
     */
    @Bean(name = "taskExecutor")
    @Primary
    public Executor taskExecutor() {
        log.info(" Initializing Scalable ThreadPoolTaskExecutor (core=10, max=50, queue=1000)");
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("AsyncWorker-");
        // CallerRunsPolicy gracefully throttles when queue is full without crashing or dropping tasks
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
