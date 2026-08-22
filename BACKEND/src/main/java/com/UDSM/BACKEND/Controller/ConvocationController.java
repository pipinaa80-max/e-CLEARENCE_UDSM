package com.UDSM.BACKEND.Controller;
import com.UDSM.BACKEND.Service.ConvocationService;
import com.UDSM.BACKEND.dto.ConvocationReceiptRequest;
import com.UDSM.BACKEND.dto.ConvocationReceiptResponse;
import com.UDSM.BACKEND.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/convocation")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class ConvocationController {

    private final ConvocationService convocationService;

    @PostMapping(value = "/submit-receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse> submitReceipt(
            @RequestPart("receipt") @Valid ConvocationReceiptRequest request,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("📝 Submitting convocation receipt for student: {}", request.getStudentId());

        ApiResponse response = convocationService.submitReceipt(request, file, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending")
    public ResponseEntity<ConvocationReceiptResponse> getPendingReceipts(
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("📋 Getting pending convocation receipts for officer: {}", userDetails.getUsername());

        ConvocationReceiptResponse response = convocationService.getPendingReceipts();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/approve/{receiptId}")
    public ResponseEntity<ApiResponse> approveReceipt(
            @PathVariable String receiptId,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("✅ Approving convocation receipt: {}", receiptId);

        ApiResponse response = convocationService.approveReceipt(receiptId, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reject/{receiptId}")
    public ResponseEntity<ApiResponse> rejectReceipt(
            @PathVariable String receiptId,
            @RequestParam String reason,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("❌ Rejecting convocation receipt: {}, reason: {}", receiptId, reason);

        ApiResponse response = convocationService.rejectReceipt(receiptId, reason, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{studentId}")
    public ResponseEntity<ApiResponse> getReceiptStatus(@PathVariable String studentId) {
        log.info("📊 Getting receipt status for student: {}", studentId);
        return ResponseEntity.ok(convocationService.getReceiptStatus(studentId));
    }
}