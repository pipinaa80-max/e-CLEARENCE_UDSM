
package com.UDSM.BACKEND.Controller;

import com.UDSM.BACKEND.Service.DocumentService;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/upload")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse> uploadDocument(
            @RequestPart("document") @Valid DocumentDTO documentDTO,
            @RequestPart("file") MultipartFile file) {

        ApiResponse response = documentService.uploadDocument(documentDTO, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<Page<DocumentResponse>> getStudentDocuments(
            @PathVariable String studentId,
            Pageable pageable) {

        Page<DocumentResponse> documents = documentService.getStudentDocumentsWithPagination(studentId, pageable);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/student/{studentId}/categories")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<List<String>> getStudentDocumentCategories(@PathVariable String studentId) {
        List<String> categories = documentService.getUploadedDocumentCategories(studentId);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/student/{studentId}/missing")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<List<String>> getMissingDocuments(@PathVariable String studentId) {
        List<String> missing = documentService.getMissingDocuments(studentId);
        return ResponseEntity.ok(missing);
    }

    @GetMapping("/student/{studentId}/has-required")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMINISTRATOR')")
    public ResponseEntity<Boolean> hasRequiredDocuments(@PathVariable String studentId) {
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
    public ResponseEntity<ApiResponse> getVerificationStatus(@PathVariable String studentId) {
        ApiResponse response = documentService.getDocumentVerificationStatus(studentId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{documentId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse> deleteDocument(
            @PathVariable String documentId,
            @RequestParam String studentId) {

        ApiResponse response = documentService.deleteDocument(documentId, studentId);
        return ResponseEntity.ok(response);
    }
}