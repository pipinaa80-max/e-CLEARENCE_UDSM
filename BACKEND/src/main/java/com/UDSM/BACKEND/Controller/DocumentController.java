
package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Service.DocumentService;
import com.UDSM.BACKEND.Service.TranscriptPaymentRequestService;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.dto.ApiResponse;
import com.UDSM.BACKEND.dto.DocumentDTO;
import com.UDSM.BACKEND.dto.DocumentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/documents")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final TranscriptPaymentRequestService transcriptPaymentRequestService;

    @PostMapping("/upload")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse> uploadDocument(
            @RequestPart("document") @Valid DocumentDTO documentDTO,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal User student) {

        if (student == null || !student.getId().equals(documentDTO.getStudentId())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Students can only upload documents to their own account.");
        }
        String description = documentDTO.getDescription();
        String transcriptPrefix = "Transcript document for payment request ";
        if (description != null && description.startsWith(transcriptPrefix)) {
            String paymentId = description.substring(transcriptPrefix.length()).trim();
            if (!Set.of("Birth Certificate", "O-Level Certificate", "A-Level Certificate")
                    .contains(documentDTO.getFileType()) ||
                    !transcriptPaymentRequestService.hasApprovedPayment(student, paymentId)) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "An approved transcript payment is required for these documents.");
            }
        } else if ("Transcript".equalsIgnoreCase(documentDTO.getFileType())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Transcript documents must be linked to an approved payment request.");
        }

        ApiResponse response = documentService.uploadDocument(documentDTO, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/transcript/{paymentId}/has-required")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Boolean> hasRequiredTranscriptDocuments(@PathVariable String paymentId,
                                                                   @AuthenticationPrincipal User student) {
        if (student == null || !transcriptPaymentRequestService.hasApprovedPayment(student, paymentId)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "An approved transcript payment is required.");
        }
        return ResponseEntity.ok(documentService.hasRequiredTranscriptDocuments(student.getId(), paymentId));
    }

    @GetMapping("/transcript/{paymentId}/categories")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<String>> getTranscriptDocumentCategories(@PathVariable String paymentId,
                                                                         @AuthenticationPrincipal User student) {
        if (student == null || !transcriptPaymentRequestService.hasApprovedPayment(student, paymentId)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "An approved transcript payment is required.");
        }
        return ResponseEntity.ok(documentService.getTranscriptDocumentCategories(student.getId(), paymentId));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR', 'DUS_SECRETARY', 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', 'PRINCIPAL', 'DEPARTMENT_OFFICER')")
    public ResponseEntity<Page<DocumentResponse>> getStudentDocuments(
            @PathVariable String studentId,
            Pageable pageable,
            @AuthenticationPrincipal User authenticatedUser) {

        requireOwnStudentRecord(authenticatedUser, studentId);

        Page<DocumentResponse> documents = documentService.getStudentDocumentsWithPagination(studentId, pageable);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/student/{studentId}/categories")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<List<String>> getStudentDocumentCategories(@PathVariable String studentId,
                                                                       @AuthenticationPrincipal User authenticatedUser) {
        requireOwnStudentRecord(authenticatedUser, studentId);
        List<String> categories = documentService.getUploadedDocumentCategories(studentId);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/student/{studentId}/missing")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<List<String>> getMissingDocuments(@PathVariable String studentId,
                                                             @AuthenticationPrincipal User authenticatedUser) {
        requireOwnStudentRecord(authenticatedUser, studentId);
        List<String> missing = documentService.getMissingDocuments(studentId);
        return ResponseEntity.ok(missing);
    }

    @GetMapping("/student/{studentId}/has-required")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<Boolean> hasRequiredDocuments(@PathVariable String studentId,
                                                         @AuthenticationPrincipal User authenticatedUser) {
        requireOwnStudentRecord(authenticatedUser, studentId);
        boolean hasAll = documentService.hasRequiredClearanceDocuments(studentId);
        return ResponseEntity.ok(hasAll);
    }

    @PutMapping("/verify/{documentId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'DEPARTMENT_OFFICER')")
    public ResponseEntity<ApiResponse> verifyDocument(
            @PathVariable String documentId,
            @RequestParam String officerId,
            @RequestParam boolean verified,
            @RequestParam(required = false) String comment) {

        ApiResponse response = documentService.verifyDocument(documentId, officerId, verified, comment);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/student/{studentId}/verification-status")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<ApiResponse> getVerificationStatus(@PathVariable String studentId,
                                                              @AuthenticationPrincipal User authenticatedUser) {
        requireOwnStudentRecord(authenticatedUser, studentId);
        ApiResponse response = documentService.getDocumentVerificationStatus(studentId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<ApiResponse> deleteDocument(
            @PathVariable String documentId,
            @RequestParam String studentId,
            @AuthenticationPrincipal User authenticatedUser) {

        requireOwnStudentRecord(authenticatedUser, studentId);

        ApiResponse response = documentService.deleteDocument(documentId, studentId);
        return ResponseEntity.ok(response);
    }

    private void requireOwnStudentRecord(User authenticatedUser, String studentId) {
        if (authenticatedUser == null ||
                (authenticatedUser.getRole() == com.UDSM.BACKEND.Model.ERole.STUDENT && !authenticatedUser.getId().equals(studentId))) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Students may only access their own documents.");
        }
    }
}
