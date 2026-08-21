package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Service.ClearanceService;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.ClearanceRequestDTO;
import com.UDSM.BACKEND.dto.ClearanceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/clearance")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")

public class ClearanceController {

    private final ClearanceService clearanceService;

    @PostMapping("/request")
    public ResponseEntity<ApiResponse> submitClearanceRequest(@RequestBody ClearanceRequestDTO requestDTO) {
        ApiResponse response = clearanceService.submitClearanceRequest(requestDTO);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{studentId}")
    public ResponseEntity<ClearanceResponse> getClearanceStatus(@PathVariable String studentId) {
        ClearanceResponse response = clearanceService.getClearanceStatus(studentId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/registration/{registrationNumber}")
    public ResponseEntity<ClearanceResponse> getClearanceStatusByRegistration(
            @PathVariable String registrationNumber) {
        ClearanceResponse response = clearanceService.getClearanceStatusByRegistrationNumber(registrationNumber);
        return ResponseEntity.ok(response);
    }
}