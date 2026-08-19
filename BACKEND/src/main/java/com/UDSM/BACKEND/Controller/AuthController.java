package com.UDSM.BACKEND.Controller;
import com.UDSM.BACKEND.Service.AuthService;
import com.UDSM.BACKEND.dto.*;
import jakarta.validation.Valid;
import lombok.Generated;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/auth"})
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class AuthController {
    private final AuthService authService;

    @PostMapping({"/login"})
    public ResponseEntity<JwtResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(this.authService.login(request));
    }

    @PostMapping({"/register"})
    public ResponseEntity<ApiResponse> register(@RequestBody @Valid RegisterRequest request) {
        return ResponseEntity.ok(this.authService.register(request));
    }

    @PostMapping({"/refresh"})
    public ResponseEntity<JwtResponse> refreshToken(@RequestParam String refreshToken) {
        return ResponseEntity.ok(this.authService.refreshToken(refreshToken));
    }

    @PostMapping({"/logout"})
    public ResponseEntity<ApiResponse> logout() {
        return ResponseEntity.ok(this.authService.logout());
    }

    @PostMapping({"/change-password"})
    public ResponseEntity<ApiResponse> changePassword(@RequestBody @Valid ChangePasswordRequest request) {
        return ResponseEntity.ok(this.authService.changePassword(request));
    }

    @PostMapping({"/reset-password"})
    public ResponseEntity<ApiResponse> resetPassword(@RequestParam String email) {
        return ResponseEntity.ok(this.authService.resetPassword(email));
    }

    @PostMapping({"/reset-password/confirm"})
    public ResponseEntity<ApiResponse> resetPasswordConfirm(@RequestParam String token, @RequestParam String newPassword) {
        return ResponseEntity.ok(this.authService.resetPasswordWithToken(token, newPassword));
    }

    @GetMapping({"/profile"})
    public ResponseEntity<UserProfileResponse> getProfile() {
        return ResponseEntity.ok(this.authService.getCurrentUserProfile());
    }

    @PutMapping({"/profile"})
    public ResponseEntity<UserProfileResponse> updateProfile(@RequestBody @Valid RegisterRequest request) {
        return ResponseEntity.ok(this.authService.updateProfile(request));
    }

    @GetMapping({"/profile/{userId}"})
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable String userId) {
        return ResponseEntity.ok(this.authService.getUserProfile(userId));
    }

    @PutMapping({"/activate/{userId}"})
    public ResponseEntity<ApiResponse> activateAccount(@PathVariable String userId) {
        return ResponseEntity.ok(this.authService.activateAccount(userId));
    }

    @PutMapping({"/deactivate/{userId}"})
    public ResponseEntity<ApiResponse> deactivateAccount(@PathVariable String userId) {
        return ResponseEntity.ok(this.authService.deactivateAccount(userId));
    }

    @Generated
    public AuthController(final AuthService authService) {
        this.authService = authService;
    }
}
