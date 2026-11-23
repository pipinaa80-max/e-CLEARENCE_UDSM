package com.UDSM.BACKEND.Service;

import com.UDSM.BACKEND.Model.TranscriptPaymentRequest;
import com.UDSM.BACKEND.Model.User;
import com.UDSM.BACKEND.Repository.TranscriptPaymentRequestRepository;
import com.UDSM.BACKEND.dto.TranscriptPaymentResponse;
import com.UDSM.BACKEND.dto.TranscriptPaymentSubmitRequest;
import com.UDSM.BACKEND.dto.TranscriptCollectionUpdateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class TranscriptPaymentRequestService {
    private final TranscriptPaymentRequestRepository repository;
    private final DocumentService documentService;

    public TranscriptPaymentRequestService(TranscriptPaymentRequestRepository repository, DocumentService documentService) {
        this.repository = repository;
        this.documentService = documentService;
    }

    @Transactional
    public TranscriptPaymentResponse submit(User student, TranscriptPaymentSubmitRequest input) {
        if (student.getRole() == null || !"STUDENT".equals(student.getRole().name())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only students can submit transcript payments.");
        }
        if (student.getRegistrationNumber() == null || student.getRegistrationNumber().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student registration number is missing.");
        }

        String projectId = projectId(student);
        String controlNumber = input.controlNumber().trim().toUpperCase(Locale.ROOT);
        if (repository.existsByProjectIdAndControlNumberIgnoreCase(projectId, controlNumber)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This control number is already linked to another transcript payment request.");
        }
        if (repository.findFirstByProjectIdAndStudentIdAndStatusOrderBySubmittedAtDesc(projectId, student.getId(), "PENDING").isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A transcript payment is already awaiting Finance verification.");
        }

        TranscriptPaymentRequest request = new TranscriptPaymentRequest();
        String studentName = student.getFullName();
        if (studentName == null || studentName.isBlank()) {
            studentName = java.util.stream.Stream.of(student.getFirstName(), student.getMiddleName(), student.getLastName())
                    .filter(value -> value != null && !value.isBlank())
                    .collect(java.util.stream.Collectors.joining(" "));
        }
        if (studentName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student name is missing.");
        }
        request.setProjectId(projectId);
        request.setStudentId(student.getId());
        request.setActiveStudentId(student.getId());
        request.setStudentName(studentName);
        request.setRegistrationNumber(student.getRegistrationNumber());
        request.setCopies(1);
        request.setAmountTzs(15_000);
        request.setControlNumber(controlNumber);
        request.setStatus("PENDING");
        request.setRejectionReason(null);
        request.setReviewedAt(null);
        request.setReviewedBy(null);
        request.setSubmittedAt(LocalDateTime.now());
        return TranscriptPaymentResponse.from(repository.save(request));
    }

    @Transactional(readOnly = true)
    public List<TranscriptPaymentResponse> getMine(User student) {
        return repository.findByProjectIdAndStudentIdOrderBySubmittedAtAsc(projectId(student), student.getId())
                .stream().map(TranscriptPaymentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public boolean hasApprovedPayment(User student) {
        return repository.existsByProjectIdAndStudentIdAndStatus(projectId(student), student.getId(), "APPROVED");
    }

    @Transactional(readOnly = true)
    public boolean hasApprovedPayment(User student, String requestId) {
        if (requestId == null || requestId.isBlank()) return false;
        return repository.findById(requestId)
                .filter(request -> projectId(student).equals(request.getProjectId()))
                .filter(request -> student.getId().equals(request.getStudentId()))
                .filter(request -> "APPROVED".equals(request.getStatus()))
                .isPresent();
    }

    @Transactional(readOnly = true)
    public List<TranscriptPaymentResponse> getFinanceRequests(User financeUser, String status) {
        String projectId = projectId(financeUser);
        List<TranscriptPaymentRequest> requests;
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            requests = repository.findByProjectIdOrderBySubmittedAtDesc(projectId);
        } else {
            String normalized = status.trim().toUpperCase();
            if (!List.of("PENDING", "APPROVED", "REJECTED").contains(normalized)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported transcript payment status.");
            }
            requests = repository.findByProjectIdAndStatusOrderBySubmittedAtDesc(projectId, normalized);
        }
        return requests.stream().map(TranscriptPaymentResponse::from).toList();
    }

    @Transactional
    public TranscriptPaymentResponse approve(User reviewer, String id) {
        TranscriptPaymentRequest request = getPendingForReview(reviewer, id);
        request.setStatus("APPROVED");
        request.setActiveStudentId(null);
        request.setReviewedBy(reviewer.getUsername());
        request.setReviewedAt(LocalDateTime.now());
        request.setRejectionReason(null);
        return TranscriptPaymentResponse.from(repository.save(request));
    }

    @Transactional
    public TranscriptPaymentResponse reject(User reviewer, String id, String reason) {
        TranscriptPaymentRequest request = getPendingForReview(reviewer, id);
        request.setStatus("REJECTED");
        request.setActiveStudentId(null);
        request.setReviewedBy(reviewer.getUsername());
        request.setReviewedAt(LocalDateTime.now());
        request.setRejectionReason(reason.trim());
        return TranscriptPaymentResponse.from(repository.save(request));
    }

    @Transactional
    public TranscriptPaymentResponse updateCollection(User student, String id, TranscriptCollectionUpdateRequest input) {
        if (student.getRole() == null || !"STUDENT".equals(student.getRole().name())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only students can update their transcript collection preference.");
        }
        TranscriptPaymentRequest request = repository.findById(id)
                .filter(item -> projectId(student).equals(item.getProjectId()))
                .filter(item -> student.getId().equals(item.getStudentId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transcript payment request not found."));
        if (!"APPROVED".equals(request.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Finance approval is required before selecting collection.");
        }
        if (!documentService.hasRequiredTranscriptDocuments(student.getId(), id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "All required transcript documents must be uploaded before selecting collection.");
        }
        request.setCollectionMethod(input.collectionMethod());
        request.setCollectionAddress(input.collectionAddress().trim());
        request.setPostingRegion(input.postingRegion());
        request.setPostingWard(input.postingWard());
        request.setPostingPoBox(input.postingPoBox());
        request.setContactPhone(input.contactPhone());
        request.setContactEmail(input.contactEmail());
        return TranscriptPaymentResponse.from(repository.save(request));
    }

    private TranscriptPaymentRequest getPendingForReview(User reviewer, String id) {
        TranscriptPaymentRequest request = repository.findById(id)
                .filter(item -> projectId(reviewer).equals(item.getProjectId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transcript payment request not found."));
        if (!"PENDING".equals(request.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This transcript payment request has already been reviewed.");
        }
        return request;
    }

    private String projectId(User user) {
        return user.getProjectId() == null || user.getProjectId().isBlank() ? "UDSM-MAIN" : user.getProjectId();
    }
}
