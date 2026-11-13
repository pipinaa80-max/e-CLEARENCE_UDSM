package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.ClearanceRequest;
import com.UDSM.BACKEND.Model.ProjectLocalStorage;
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
import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRATOR')")
public class AdminController {

    private final AdminService adminService;
    private final AuthService authService;

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        log.info("Admin: Fetching all users via service");
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
        ApiResponse response = authService.register(request);
        adminService.activateUserByEmail(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("User registered and activated successfully"));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<ApiResponse> deleteUser(@PathVariable String userId) {
        log.info("Admin: Deleting user: {}", userId);
        adminService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully"));
    }

    @DeleteMapping("/users")
    public ResponseEntity<ApiResponse> deleteUsers(@RequestBody List<String> userIds) {
        log.info("Admin: Bulk deleting {} users", userIds.size());
        adminService.deleteUsers(userIds);
        return ResponseEntity.ok(ApiResponse.success("Selected users deleted successfully"));
    }

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable String userId, @RequestParam String role) {
        log.info("Admin: Updating user role: {} to {}", userId, role);
        return ResponseEntity.ok(adminService.updateUserRole(userId, role));
    }

    @GetMapping("/clearance-requests")
    public ResponseEntity<List<Map<String, Object>>> getAllClearanceRequests() {
        log.info("Admin: Fetching all clearance requests");
        return ResponseEntity.ok(adminService.getAllClearanceRequests());
    }

    @PostMapping("/users/bulk-upload")
    public ResponseEntity<ApiResponse> bulkUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "uploadType", required = false, defaultValue = "STUDENT") String uploadType) {
        log.info("Admin: Bulk upload initiated for file: {}, uploadType: {}", file.getOriginalFilename(), uploadType);
        try {
            int count = adminService.processBulkUpload(file, uploadType);
            String label = "STAFF".equalsIgnoreCase(uploadType) ? "staff members" : "students";
            return ResponseEntity.ok(ApiResponse.success("Successfully uploaded and processed " + count + " " + label + "."));
        } catch (Exception e) {
            log.error("Bulk upload failed: ", e);
            return ResponseEntity.badRequest().body(ApiResponse.error("Bulk upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/export/template/excel")
    public ResponseEntity<byte[]> downloadExcelTemplate(@RequestParam(value = "type", defaultValue = "STUDENT") String type) {
        try {
            boolean isStaff = "STAFF".equalsIgnoreCase(type);
            byte[] bytes = isStaff
                ? com.UDSM.BACKEND.util.ExcelDataGenerator.generateEmptyStaffTemplateExcelBytes()
                : com.UDSM.BACKEND.util.ExcelDataGenerator.generateEmptyTemplateExcelBytes();
            String filename = isStaff ? "staff_registration_template.xlsx" : "clearance_registration_template.xlsx";
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=" + filename)
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(bytes);
        } catch (Exception e) {
            log.error("Failed to generate Excel template: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/export/template/csv")
    public ResponseEntity<byte[]> downloadCsvTemplate(@RequestParam(value = "type", defaultValue = "STUDENT") String type) {
        try {
            boolean isStaff = "STAFF".equalsIgnoreCase(type);
            byte[] bytes = isStaff
                ? com.UDSM.BACKEND.util.ExcelDataGenerator.generateEmptyStaffTemplateCsvBytes()
                : com.UDSM.BACKEND.util.ExcelDataGenerator.generateEmptyTemplateCsvBytes();
            String filename = isStaff ? "staff_registration_template.csv" : "clearance_registration_template.csv";
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=" + filename)
                    .header("Content-Type", "text/csv; charset=UTF-8")
                    .body(bytes);
        } catch (Exception e) {
            log.error("Failed to generate CSV template: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/users/seed-sample-data")
    public ResponseEntity<ApiResponse> seedSampleData() {
        log.info("Admin: Seeding UDSM sample table data (20 students and clearance staff)");
        int count = adminService.seedUdsmSampleData();
        return ResponseEntity.ok(ApiResponse.success("Successfully seeded " + count + " users matching UDSM table format."));
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportUsersToExcel() {
        try {
            byte[] bytes = adminService.exportUsersToExcel();
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=udsm_clearance_users.xlsx")
                    .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(bytes);
        } catch (Exception e) {
            log.error("Failed to export Excel: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportUsersToCsv() {
        try {
            byte[] bytes = adminService.exportUsersToCsv();
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=udsm_clearance_users.csv")
                    .header("Content-Type", "text/csv; charset=UTF-8")
                    .body(bytes);
        } catch (Exception e) {
            log.error("Failed to export CSV: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/generate-sample-files")
    public ResponseEntity<ApiResponse> generateSampleFiles() {
        adminService.regenerateSampleFiles();
        return ResponseEntity.ok(ApiResponse.success("Successfully exported live database records to spreadsheets."));
    }

    @PostMapping("/import/local-storage")
    public ResponseEntity<?> importLocalStorage(@RequestBody JsonNode export) {
        return ResponseEntity.ok(adminService.importLocalStorage(export));
    }

    @GetMapping("/import/local-storage")
    public ResponseEntity<List<ProjectLocalStorage>> getImportedLocalStorage() {
        return ResponseEntity.ok(adminService.getImportedLocalStorage());
    }
}
