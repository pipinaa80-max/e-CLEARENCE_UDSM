package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.ClearanceRequest;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Service.AdminService;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.RegisterRequest;
import com.UDSM.BACKEND.Service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRATOR')")
public class AdminController {

    private final AdminService adminService;
    private final AuthService authService;

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        log.info("Admin: Fetching all users");
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/roles")
    public ResponseEntity<List<String>> getAllRoles() {
        log.info("Admin: Fetching all available roles");
        return ResponseEntity.ok(adminService.getAllRoles());
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse> createUser(@RequestBody RegisterRequest request) {
        log.info("Admin: Manually creating user: {}", request.getEmail());
        return ResponseEntity.ok(authService.register(request));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<ApiResponse> deleteUser(@PathVariable String userId) {
        log.info("Admin: Deleting user: {}", userId);
        adminService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully"));
    }

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable String userId, @RequestParam String role) {
        log.info("Admin: Updating user role: {} to {}", userId, role);
        return ResponseEntity.ok(adminService.updateUserRole(userId, role));
    }

    @GetMapping("/clearance-requests")
    public ResponseEntity<List<ClearanceRequest>> getAllClearanceRequests() {
        log.info("Admin: Fetching all clearance requests");
        return ResponseEntity.ok(adminService.getAllClearanceRequests());
    }

    @PostMapping("/users/bulk-upload")
    public ResponseEntity<ApiResponse> bulkUpload(@RequestParam("file") MultipartFile file) {
        log.info("Admin: Bulk upload initiated for file: {}", file.getOriginalFilename());
        try {
            int count = adminService.processBulkUpload(file);
            return ResponseEntity.ok(ApiResponse.success("Successfully uploaded and processed " + count + " users."));
        } catch (Exception e) {
            log.error("Bulk upload failed: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("Bulk upload failed: " + e.getMessage()));
        }
    }
}
