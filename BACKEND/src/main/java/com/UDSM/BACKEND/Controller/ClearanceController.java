

package com.UDSM.BACKEND.Controller;
import com.UDSM.BACKEND.Service.ClearanceService;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.ClearanceRequestDTO;
import com.UDSM.BACKEND.dto.ClearanceResponse;
import jakarta.validation.Valid;
import lombok.Generated;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/clearance"})
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class ClearanceController {
    private final ClearanceService clearanceService;

    @PostMapping({"/request"})
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse> submitClearanceRequest(@RequestBody @Valid ClearanceRequestDTO request) {
        return ResponseEntity.ok(this.clearanceService.submitClearanceRequest(request));
    }

    @GetMapping({"/status/{studentId}"})
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<ClearanceResponse> getClearanceStatus(@PathVariable String studentId) {
        return ResponseEntity.ok(this.clearanceService.getClearanceStatus(studentId));
    }

    @GetMapping({"/student/{studentId}"})
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<Page<ClearanceResponse>> getStudentClearanceHistory(@PathVariable String studentId, Pageable pageable) {
        return ResponseEntity.ok(this.clearanceService.getStudentClearanceHistory(studentId, pageable));
    }

    @GetMapping({"/department/{department}"})
    @PreAuthorize("hasAnyRole('DEPARTMENT_OFFICER', 'ADMINISTRATOR')")
    public ResponseEntity<Page<ClearanceResponse>> getDepartmentClearanceRequests(@PathVariable String department, @RequestParam(required = false) String status, Pageable pageable) {
        return ResponseEntity.ok(this.clearanceService.getDepartmentClearanceRequests(department, status, pageable));
    }

    @PutMapping({"/approve/{requestId}"})
    @PreAuthorize("hasAnyRole('DEPARTMENT_OFFICER', 'FINANCE_OFFICER', 'LIBRARY_OFFICER', 'ADMINISTRATOR')")
    public ResponseEntity<ApiResponse> approveClearance(@PathVariable String requestId, @RequestParam String department, @RequestParam(required = false) String comments) {
        return ResponseEntity.ok(this.clearanceService.approveClearance(requestId, department, comments));
    }

    @PutMapping({"/reject/{requestId}"})
    @PreAuthorize("hasAnyRole('DEPARTMENT_OFFICER', 'FINANCE_OFFICER', 'LIBRARY_OFFICER', 'ADMINISTRATOR')")
    public ResponseEntity<ApiResponse> rejectClearance(@PathVariable String requestId, @RequestParam String department, @RequestParam String reason) {
        return ResponseEntity.ok(this.clearanceService.rejectClearance(requestId, department, reason));
    }

    @GetMapping({"/certificate/{studentId}"})
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<byte[]> generateClearanceCertificate(@PathVariable String studentId) {
        return this.clearanceService.generateClearanceCertificate(studentId);
    }

    @Generated
    public ClearanceController(final ClearanceService clearanceService) {
        this.clearanceService = clearanceService;
    }
}
