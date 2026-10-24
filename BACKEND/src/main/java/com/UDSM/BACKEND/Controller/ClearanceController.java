package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Service.ClearanceService;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.ClearanceRequestDTO;
import com.UDSM.BACKEND.dto.ClearanceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/clearance")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")

public class ClearanceController {

    private final ClearanceService clearanceService;

    @PostMapping("/request")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse> submitClearanceRequest(
            @RequestBody ClearanceRequestDTO requestDTO,
            Authentication authentication) {
        ApiResponse response = clearanceService.submitClearanceRequest(requestDTO, authentication);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'DEPARTMENT_OFFICER', 'FINANCE_OFFICER', 'LIBRARY_OFFICER', 'ICT_OFFICER', 'CONVOCATION_OFFICER', 'GAMES_COACH', 'HALL_WARDEN', 'USAB_OFFICER', 'DARUSO_OFFICER', 'DEAN_OF_STUDENTS', 'SMART_CARD_OFFICER', 'WORKSHOP_OFFICER', 'PRINCIPAL', 'LABORATORY_OFFICER')")
    public ResponseEntity<ClearanceResponse> getClearanceStatus(
            @PathVariable String studentId,
            Authentication authentication) {
        ClearanceResponse response = clearanceService.getClearanceStatus(studentId, authentication);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/registration/{registrationNumber}")
    @PreAuthorize("hasAnyRole('STUDENT', 'SUPERUSER', 'ADMINISTRATOR', 'DEPARTMENT_OFFICER', 'FINANCE_OFFICER', 'LIBRARY_OFFICER', 'ICT_OFFICER', 'CONVOCATION_OFFICER', 'GAMES_COACH', 'HALL_WARDEN', 'USAB_OFFICER', 'DARUSO_OFFICER', 'DEAN_OF_STUDENTS', 'SMART_CARD_OFFICER', 'WORKSHOP_OFFICER', 'PRINCIPAL', 'LABORATORY_OFFICER')")
    public ResponseEntity<ClearanceResponse> getClearanceStatusByRegistration(
            @PathVariable String registrationNumber,
            Authentication authentication) {
        ClearanceResponse response = clearanceService.getClearanceStatusByRegistrationNumber(registrationNumber, authentication);
        return ResponseEntity.ok(response);
    }
}