package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Service.ControlPlaneService;
import com.UDSM.BACKEND.config.IpBlockingFilter;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@Slf4j
@RequiredArgsConstructor
public class HoneypotController {

    private final ControlPlaneService controlPlaneService;

    /**
     * Honeypot Decoy Endpoints:
     * Vulnerability scanners frequently look for WordPress, PHP, environment files, or open admin consoles.
     * Any client calling these paths is an automated scanner or attacker.
     */
    @RequestMapping(
            value = {
                    "/.env",
                    "/.git",
                    "/.git/config",
                    "/wp-admin",
                    "/wp-login.php",
                    "/admin.php",
                    "/phpmyadmin",
                    "/pma",
                    "/xmlrpc.php",
                    "/api/v1/honeypot/trap",
                    "/actuator/env",
                    "/actuator/heapdump"
            },
            method = {RequestMethod.GET, RequestMethod.POST}
    )
    public ResponseEntity<Map<String, Object>> trapMaliciousScanner(HttpServletRequest request) {
        String clientIp = IpBlockingFilter.extractClientIp(request);
        String requestedUri = request.getRequestURI();

        log.warn("🚨 SECURITY HONEYPOT TRAP TRIGGERED: Attacker at IP {} probed decoy path {}", clientIp, requestedUri);
        controlPlaneService.autoBlockIp(clientIp, "Probed scanner decoy honeypot endpoint: " + requestedUri);

        return ResponseEntity.status(HttpStatus.I_AM_A_TEAPOT).body(Map.of(
                "status", 418,
                "error", "I'm a teapot",
                "message", "Security honeypot triggered. Your IP address has been flagged and banned."
        ));
    }
}
