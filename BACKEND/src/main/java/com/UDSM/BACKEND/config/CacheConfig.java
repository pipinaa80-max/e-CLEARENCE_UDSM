package com.UDSM.BACKEND.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
@Slf4j
public class CacheConfig {

    public static final String CACHE_COLLEGES = "colleges";
    public static final String CACHE_DEPARTMENTS = "departments";
    public static final String CACHE_STATIONS = "stations";
    public static final String CACHE_SETTINGS = "projectSettings";
    public static final String CACHE_SPONSORS = "sponsors";

    /**
     * High-throughput CacheManager for static lookups.
     * Uses in-memory concurrent caching by default, with automatic fallback support for distributed Redis
     * when configured in cluster environments via spring.cache.type=redis.
     */
    @Bean
    @ConditionalOnMissingBean(CacheManager.class)
    public CacheManager cacheManager() {
        log.info("⚡ Initializing High-Speed Cache Manager for Lookups (colleges, departments, stations, sponsors)");
        ConcurrentMapCacheManager manager = new ConcurrentMapCacheManager(
                CACHE_COLLEGES, CACHE_DEPARTMENTS, CACHE_STATIONS, CACHE_SETTINGS, CACHE_SPONSORS
        );
        manager.setAllowNullValues(false);
        return manager;
    }
}
