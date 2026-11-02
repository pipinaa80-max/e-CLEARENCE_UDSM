package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Service.ClearanceService;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.ClearanceDecisionRequest;
import com.UDSM.BACKEND.dto.ClearanceRequestDTO;
import com.UDSM.BACKEND.dto.ClearanceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/clearance")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class ClearanceController {

    private final ClearanceService clearanceService;

    public ClearanceController(ClearanceService clearanceService) {
        this.clearanceService = clearanceService;
    }

    // =========================================================
    // STUDENT ENDPOINTS
    // =========================================================

    @PostMapping("/request")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse> submitClearanceRequest(
            @RequestBody ClearanceRequestDTO requestDTO,
            Authentication authentication) {
        ApiResponse response = clearanceService.submitClearanceRequest(requestDTO, authentication);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-request")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ClearanceResponse> getMyClearanceRequest(Authentication authentication) {
        ClearanceResponse response = clearanceService.getMyClearanceRequest(authentication);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'DEPARTMENT_OFFICER', 'FINANCE_OFFICER', 'LIBRARY_OFFICER', 'ICT_OFFICER', 'CONVOCATION_OFFICER', 'GAMES_COACH', 'HALL_WARDEN', 'USAB_OFFICER', 'DARUSO_OFFICER', 'DEAN_OF_STUDENTS', 'SMART_CARD_OFFICER', 'WORKSHOP_OFFICER', 'PRINCIPAL', 'LABORATORY_OFFICER', 'LECTURER')")
    public ResponseEntity<ClearanceResponse> getClearanceStatus(
            @PathVariable String studentId,
            Authentication authentication) {
        ClearanceResponse response = clearanceService.getClearanceStatus(studentId, authentication);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/registration/{registrationNumber}")
    @PreAuthorize("hasAnyRole('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'DEPARTMENT_OFFICER', 'FINANCE_OFFICER', 'LIBRARY_OFFICER', 'ICT_OFFICER', 'CONVOCATION_OFFICER', 'GAMES_COACH', 'HALL_WARDEN', 'USAB_OFFICER', 'DARUSO_OFFICER', 'DEAN_OF_STUDENTS', 'SMART_CARD_OFFICER', 'WORKSHOP_OFFICER', 'PRINCIPAL', 'LABORATORY_OFFICER', 'LECTURER')")
    public ResponseEntity<ClearanceResponse> getClearanceStatusByRegistration(
            @PathVariable String registrationNumber,
            Authentication authentication) {
        ClearanceResponse response = clearanceService.getClearanceStatusByRegistrationNumber(registrationNumber, authentication);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/analytics-summary")
    @PreAuthorize("hasAnyRole('DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'SUPERUSER', 'ADMINISTRATOR', 'ADMIN', 'PRINCIPAL', 'DEAN_OF_STUDENTS')")
    public ResponseEntity<Map<String, Object>> getAnalyticsSummary() {
        return ResponseEntity.ok(clearanceService.getAnalyticsSummary());
    }

    // =========================================================
    // CLEARANCE OFFICE ENDPOINTS (ALL 13 OFFICES + ADMIN + DUS)
    // =========================================================

    @GetMapping("/office/requests")
    @PreAuthorize("hasAnyRole('CONVOCATION_OFFICER', 'LIBRARY_OFFICER', 'FINANCE_OFFICER', 'ICT_OFFICER', 'GAMES_COACH', 'HALL_WARDEN', 'USAB_OFFICER', 'DARUSO_OFFICER', 'DEAN_OF_STUDENTS', 'SMART_CARD_OFFICER', 'WORKSHOP_OFFICER', 'PRINCIPAL', 'LABORATORY_OFFICER', 'DEPARTMENT_OFFICER', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES')")
    public ResponseEntity<List<ClearanceResponse>> getOfficeRequests(
            @RequestParam(required = false) String office,
            @RequestParam(required = false) String status,
            Authentication authentication) {
        List<ClearanceResponse> responses = clearanceService.getOfficeRequests(office, status, authentication);
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/office/approve")
    @PreAuthorize("hasAnyRole('CONVOCATION_OFFICER', 'LIBRARY_OFFICER', 'FINANCE_OFFICER', 'ICT_OFFICER', 'GAMES_COACH', 'HALL_WARDEN', 'USAB_OFFICER', 'DARUSO_OFFICER', 'DEAN_OF_STUDENTS', 'SMART_CARD_OFFICER', 'WORKSHOP_OFFICER', 'PRINCIPAL', 'LABORATORY_OFFICER', 'DEPARTMENT_OFFICER', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES')")
    public ResponseEntity<ApiResponse> approveRequest(
            @RequestBody ClearanceDecisionRequest request,
            Authentication authentication) {
        ApiResponse response = clearanceService.approveOfficeClearance(request, authentication);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/office/reject")
    @PreAuthorize("hasAnyRole('CONVOCATION_OFFICER', 'LIBRARY_OFFICER', 'FINANCE_OFFICER', 'ICT_OFFICER', 'GAMES_COACH', 'HALL_WARDEN', 'USAB_OFFICER', 'DARUSO_OFFICER', 'DEAN_OF_STUDENTS', 'SMART_CARD_OFFICER', 'WORKSHOP_OFFICER', 'PRINCIPAL', 'LABORATORY_OFFICER', 'DEPARTMENT_OFFICER', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES')")
    public ResponseEntity<ApiResponse> rejectRequest(
            @RequestBody ClearanceDecisionRequest request,
            Authentication authentication) {
        ApiResponse response = clearanceService.rejectOfficeClearance(request, authentication);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/office/withdraw")
    @PreAuthorize("hasAnyRole('CONVOCATION_OFFICER', 'LIBRARY_OFFICER', 'FINANCE_OFFICER', 'ICT_OFFICER', 'GAMES_COACH', 'HALL_WARDEN', 'USAB_OFFICER', 'DARUSO_OFFICER', 'DEAN_OF_STUDENTS', 'SMART_CARD_OFFICER', 'WORKSHOP_OFFICER', 'PRINCIPAL', 'LABORATORY_OFFICER', 'DEPARTMENT_OFFICER', 'ADMINISTRATOR', 'ADMIN', 'SUPERUSER', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES')")
    public ResponseEntity<ApiResponse> withdrawRequest(
            @RequestBody ClearanceDecisionRequest request,
            Authentication authentication) {
        ApiResponse response = clearanceService.withdrawOfficeClearance(request, authentication);
        return ResponseEntity.ok(response);
    }
}
