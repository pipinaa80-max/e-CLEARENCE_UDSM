package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Service.AuthService;
import com.UDSM.BACKEND.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@Slf4j
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> login(
            @RequestBody @Valid LoginRequest request,
            HttpServletRequest httpRequest) {
        log.info("🔐 Login attempt for: {}", request.getIdentifier());
        String clientIp = getClientIP(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.login(request, clientIp, userAgent));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(@RequestBody @Valid RegisterRequest request) {
        log.info("📝 Registering new user: {}", request.getEmail());
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtResponse> refreshToken(@RequestParam String refreshToken) {
        log.info("🔄 Refreshing token");
        return ResponseEntity.ok(authService.refreshToken(refreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse> logout() {
        log.info("🚪 Logout request");
        return ResponseEntity.ok(authService.logout());
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse> changePassword(
            @RequestBody @Valid ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        log.info("🔑 Change password request");
        String clientIp = getClientIP(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.changePassword(request, clientIp, userAgent));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse> resetPassword(
            @RequestParam String email,
            HttpServletRequest httpRequest) {
        log.info("📧 Reset password request for: {}", email);
        String clientIp = getClientIP(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.resetPassword(email, clientIp, userAgent));
    }

    @PostMapping("/reset-password/confirm")
    public ResponseEntity<ApiResponse> resetPasswordConfirm(
            @RequestParam String token,
            @RequestParam String newPassword,
            HttpServletRequest httpRequest) {
        log.info("✅ Reset password confirm with token");
        String clientIp = getClientIP(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.resetPasswordWithToken(token, newPassword, clientIp, userAgent));
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile() {
        log.info("👤 Get current user profile");
        return ResponseEntity.ok(authService.getCurrentUserProfile());
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestBody @Valid ProfileUpdateRequest request,
            HttpServletRequest httpRequest) {
        log.info("📝 Update profile request");
        String clientIp = getClientIP(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.updateProfile(request, clientIp, userAgent));
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable String userId) {
        log.info("👤 Get user profile for: {}", userId);
        return ResponseEntity.ok(authService.getUserProfile(userId));
    }

    @PutMapping("/activate/{userId}")
    public ResponseEntity<ApiResponse> activateAccount(
            @PathVariable String userId,
            HttpServletRequest httpRequest) {
        log.info("✅ Activate account for: {}", userId);
        String clientIp = getClientIP(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.activateAccount(userId, clientIp, userAgent));
    }

    @PutMapping("/deactivate/{userId}")
    public ResponseEntity<ApiResponse> deactivateAccount(
            @PathVariable String userId,
            HttpServletRequest httpRequest) {
        log.info("⛔ Deactivate account for: {}", userId);
        String clientIp = getClientIP(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.deactivateAccount(userId, clientIp, userAgent));
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse> healthCheck() {
        log.info("💚 Health check");
        return ResponseEntity.ok(ApiResponse.success("Auth service is running"));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse> verifyEmail(@RequestParam String token) {
        log.info("📧 Verify email with token");
        return ResponseEntity.ok(authService.verifyEmail(token));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse> resendVerificationEmail(@RequestParam String email) {
        log.info("📧 Resend verification email for: {}", email);
        return ResponseEntity.ok(authService.resendVerificationEmail(email));
    }

    private String getClientIP(HttpServletRequest request) {
        if (request == null) {
            return "0.0.0.0";
        }
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isEmpty()) {
            return xfHeader.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
}