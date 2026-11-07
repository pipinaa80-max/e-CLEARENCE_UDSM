package com.UDSM.BACKEND.config;

import com.UDSM.BACKEND.Service.ControlPlaneService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class IpBlockingFilter extends OncePerRequestFilter {

    private final ControlPlaneService controlPlaneService;

    public IpBlockingFilter(@Lazy ControlPlaneService controlPlaneService) {
        this.controlPlaneService = controlPlaneService;
    }

    // Common vulnerability scanner probe paths that legitimate users will never access
    private static final Set<String> HONEYPOT_PROBE_PATHS = Set.of(
            "/.env",
            "/.git",
            "/.git/config",
            "/wp-admin",
            "/wp-login.php",
            "/admin.php",
            "/phpmyadmin",
            "/pma",
            "/xmlrpc.php",
            "/actuator/env",
            "/actuator/heapdump",
            "/eval-stdin",
            "/shell",
            "/config.json",
            "/.aws/credentials"
    );

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String clientIp = extractClientIp(request);
        String requestUri = request.getRequestURI().toLowerCase();

        // 1. Honeypot Decoy Path Trigger: Auto-block scanner IPs immediately
        if (isHoneypotProbe(requestUri)) {
            log.warn("🚨 Honeypot triggered! IP {} probed decoy path: {}", clientIp, requestUri);
            controlPlaneService.autoBlockIp(clientIp, "Probing scanner honeypot path: " + requestUri);
            writeSecurityResponse(response, HttpStatus.I_AM_A_TEAPOT.value(), "Request trapped by security honeypot. IP banned.");
            return;
        }

        // 2. Active IP Blacklist Check
        try {
            List<String> blockedIps = controlPlaneService.getBlockedIps();
            if (blockedIps != null && (blockedIps.contains(clientIp) || isLoopbackOrMatched(clientIp, blockedIps))) {
                log.warn("⛔ Rejected request from blocked IP: {} -> URI: {}", clientIp, requestUri);
                writeSecurityResponse(response, HttpStatus.FORBIDDEN.value(), "Access denied: Your IP address has been restricted by security policy.");
                return;
            }
        } catch (Exception e) {
            log.warn("Unable to evaluate blocked IPs: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private boolean isHoneypotProbe(String uri) {
        for (String probe : HONEYPOT_PROBE_PATHS) {
            if (uri.equals(probe) || uri.endsWith(probe) || uri.contains(probe)) {
                return true;
            }
        }
        return false;
    }

    private boolean isLoopbackOrMatched(String clientIp, List<String> blockedIps) {
        if ("127.0.0.1".equals(clientIp) && blockedIps.contains("localhost")) return true;
        if ("0:0:0:0:0:0:0:1".equals(clientIp) && (blockedIps.contains("127.0.0.1") || blockedIps.contains("localhost"))) return true;
        return false;
    }

    public static String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            // First IP in chain is the client IP
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }

    private void writeSecurityResponse(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(String.format("{\"status\":%d,\"message\":\"%s\"}", status, message));
    }
}
