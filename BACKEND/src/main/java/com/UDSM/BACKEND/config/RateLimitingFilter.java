package com.UDSM.BACKEND.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * High-performance sliding-window Rate Limiter for sensitive authentication endpoints.
 * Protects against distributed brute-force credential stuffing and password guessing.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    // Endpoints requiring strict brute-force rate limiting
    private static final Set<String> RATE_LIMITED_PATHS = Set.of(
            "/auth/login",
            "/auth/register",
            "/control-plane/login",
            "/auth/reset-password"
    );

    // Max 20 authentication attempts per 60 seconds per IP address
    private static final int MAX_REQUESTS_PER_WINDOW = 20;
    private static final long WINDOW_DURATION_MS = 60_000L; // 1 minute

    private final Map<String, ClientWindow> clientWindows = new ConcurrentHashMap<>();

    private static class ClientWindow {
        long windowStart;
        AtomicInteger requestCount;

        ClientWindow(long windowStart) {
            this.windowStart = windowStart;
            this.requestCount = new AtomicInteger(1);
        }
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getServletPath();
        if (path == null) path = request.getRequestURI();

        // Check if current request path is an authentication endpoint
        if (isRateLimitedPath(path)) {
            String clientIp = IpBlockingFilter.extractClientIp(request);
            long now = System.currentTimeMillis();

            // Periodic cleanup to avoid unbounded memory usage
            if (clientWindows.size() > 5000) {
                clientWindows.entrySet().removeIf(entry -> (now - entry.getValue().windowStart) > WINDOW_DURATION_MS * 2);
            }

            ClientWindow window = clientWindows.compute(clientIp, (ip, current) -> {
                if (current == null || (now - current.windowStart) > WINDOW_DURATION_MS) {
                    return new ClientWindow(now);
                }
                current.requestCount.incrementAndGet();
                return current;
            });

            if (window.requestCount.get() > MAX_REQUESTS_PER_WINDOW) {
                log.warn("⚠️ Rate limit exceeded for IP {} on path {}: {} requests in current window",
                        clientIp, path, window.requestCount.get());

                long retryAfterSec = Math.max(1, (WINDOW_DURATION_MS - (now - window.windowStart)) / 1000);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setHeader("Retry-After", String.valueOf(retryAfterSec));
                response.setHeader("X-RateLimit-Limit", String.valueOf(MAX_REQUESTS_PER_WINDOW));
                response.setHeader("X-RateLimit-Remaining", "0");
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write(String.format(
                        "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Too many authentication attempts. Please retry in %d seconds.\"}",
                        retryAfterSec
                ));
                return;
            }

            int remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - window.requestCount.get());
            response.setHeader("X-RateLimit-Limit", String.valueOf(MAX_REQUESTS_PER_WINDOW));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimitedPath(String path) {
        String lower = path.toLowerCase();
        for (String target : RATE_LIMITED_PATHS) {
            if (lower.contains(target)) {
                return true;
            }
        }
        return false;
    }
}
