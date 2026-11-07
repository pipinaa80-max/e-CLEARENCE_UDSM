package com.UDSM.BACKEND.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
@Slf4j
public class CacheConfig {

    /**
     * In-memory cache manager for high-frequency lookup entities (colleges, departments, collection stations).
     * Offloads thousands of repeated lookup queries from the database during peak traffic.
     */
    @Bean
    public CacheManager cacheManager() {
        log.info("⚡ Initializing In-Memory High-Speed Cache Manager for Lookups");
        return new ConcurrentMapCacheManager("colleges", "departments", "stations", "projectSettings");
    }
}
