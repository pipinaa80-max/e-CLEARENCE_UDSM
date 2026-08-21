package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Service.AuthService;
import com.UDSM.BACKEND.dto.*;
import jakarta.validation.Valid;
import lombok.Generated;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/auth"})
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@Slf4j
public class AuthController {
    private final AuthService authService;

    @PostMapping({"/login"})
    public ResponseEntity<JwtResponse> login(@RequestBody @Valid LoginRequest request) {
        log.info(" Login attempt for: {}", request.getIdentifier());
        return ResponseEntity.ok(this.authService.login(request));
    }

    @PostMapping({"/register"})
    public ResponseEntity<ApiResponse> register(@RequestBody @Valid RegisterRequest request) {
        log.info(" Registering new user: {}", request.getEmail());
        return ResponseEntity.ok(this.authService.register(request));
    }

    @PostMapping({"/refresh"})
    public ResponseEntity<JwtResponse> refreshToken(@RequestParam String refreshToken) {
        log.info("Refreshing token");
        return ResponseEntity.ok(this.authService.refreshToken(refreshToken));
    }

    @PostMapping({"/logout"})
    public ResponseEntity<ApiResponse> logout() {
        log.info("Logout request");
        return ResponseEntity.ok(this.authService.logout());
    }

    @PostMapping({"/change-password"})
    public ResponseEntity<ApiResponse> changePassword(@RequestBody @Valid ChangePasswordRequest request) {
        log.info("Change password request");
        return ResponseEntity.ok(this.authService.changePassword(request));
    }

    @PostMapping({"/reset-password"})
    public ResponseEntity<ApiResponse> resetPassword(@RequestParam String email) {
        log.info("Reset password request for: {}", email);
        return ResponseEntity.ok(this.authService.resetPassword(email));
    }

    @PostMapping({"/reset-password/confirm"})
    public ResponseEntity<ApiResponse> resetPasswordConfirm(@RequestParam String token, @RequestParam String newPassword) {
        log.info("Reset password confirm");
        return ResponseEntity.ok(this.authService.resetPasswordWithToken(token, newPassword));
    }

    @GetMapping({"/profile"})
    public ResponseEntity<UserProfileResponse> getProfile() {
        log.info("👤 Get current user profile");
        return ResponseEntity.ok(this.authService.getCurrentUserProfile());
    }

    // ✅ FIXED: Use ProfileUpdateRequest instead of RegisterRequest
    @PutMapping({"/profile"})
    public ResponseEntity<UserProfileResponse> updateProfile(@RequestBody @Valid ProfileUpdateRequest request) {
        log.info("Update profile request");
        return ResponseEntity.ok(this.authService.updateProfile(request));
    }

    @GetMapping({"/profile/{userId}"})
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable String userId) {
        log.info(" Get user profile for: {}", userId);
        return ResponseEntity.ok(this.authService.getUserProfile(userId));
    }

    @PutMapping({"/activate/{userId}"})
    public ResponseEntity<ApiResponse> activateAccount(@PathVariable String userId) {
        log.info("Activate account for: {}", userId);
        return ResponseEntity.ok(this.authService.activateAccount(userId));
    }

    @PutMapping({"/deactivate/{userId}"})
    public ResponseEntity<ApiResponse> deactivateAccount(@PathVariable String userId) {
        log.info("Deactivate account for: {}", userId);
        return ResponseEntity.ok(this.authService.deactivateAccount(userId));
    }

    @Generated
    public AuthController(final AuthService authService) {
        this.authService = authService;
    }
}