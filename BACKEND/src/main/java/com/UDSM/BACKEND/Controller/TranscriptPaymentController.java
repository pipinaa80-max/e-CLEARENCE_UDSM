package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Service.TranscriptPaymentRequestService;
import com.UDSM.BACKEND.dto.TranscriptPaymentDecisionRequest;
import com.UDSM.BACKEND.dto.TranscriptPaymentResponse;
import com.UDSM.BACKEND.dto.TranscriptPaymentSubmitRequest;
import com.UDSM.BACKEND.dto.TranscriptCollectionUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;

import java.util.List;

@RestController
@RequestMapping("/transcript-payments")
public class TranscriptPaymentController {
    private final TranscriptPaymentRequestService service;

    public TranscriptPaymentController(TranscriptPaymentRequestService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<TranscriptPaymentResponse> submit(
            @Valid @RequestBody TranscriptPaymentSubmitRequest request,
            @AuthenticationPrincipal User student) {
        return ResponseEntity.ok(service.submit(student, request));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('STUDENT')")
    public List<TranscriptPaymentResponse> mine(@AuthenticationPrincipal User student) {
        return service.getMine(student);
    }

    @GetMapping("/finance")
    @PreAuthorize("hasAnyRole('FINANCE_OFFICER', 'ADMINISTRATOR', 'SUPERUSER')")
    public List<TranscriptPaymentResponse> finance(
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal User reviewer) {
        return service.getFinanceRequests(reviewer, status);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('FINANCE_OFFICER', 'ADMINISTRATOR', 'SUPERUSER')")
    public TranscriptPaymentResponse approve(@PathVariable String id, @AuthenticationPrincipal User reviewer) {
        return service.approve(reviewer, id);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('FINANCE_OFFICER', 'ADMINISTRATOR', 'SUPERUSER')")
    public TranscriptPaymentResponse reject(
            @PathVariable String id,
            @Valid @RequestBody TranscriptPaymentDecisionRequest decision,
            @AuthenticationPrincipal User reviewer) {
        return service.reject(reviewer, id, decision.reason());
    }

    @PutMapping("/{id}/collection")
    @PreAuthorize("hasRole('STUDENT')")
    public TranscriptPaymentResponse updateCollection(
            @PathVariable String id,
            @Valid @RequestBody TranscriptCollectionUpdateRequest request,
            @AuthenticationPrincipal User student) {
        return service.updateCollection(student, id, request);
    }
}
