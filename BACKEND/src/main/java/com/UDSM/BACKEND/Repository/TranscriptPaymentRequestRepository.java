package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.TranscriptPaymentRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TranscriptPaymentRequestRepository extends JpaRepository<TranscriptPaymentRequest, String> {
    List<TranscriptPaymentRequest> findByProjectIdAndStudentIdOrderBySubmittedAtAsc(String projectId, String studentId);
    List<TranscriptPaymentRequest> findByProjectIdOrderBySubmittedAtDesc(String projectId);
    List<TranscriptPaymentRequest> findByProjectIdAndStatusOrderBySubmittedAtDesc(String projectId, String status);
    Optional<TranscriptPaymentRequest> findFirstByProjectIdAndStudentIdAndStatusOrderBySubmittedAtDesc(String projectId, String studentId, String status);
    boolean existsByProjectIdAndControlNumberIgnoreCase(String projectId, String controlNumber);
    boolean existsByProjectIdAndStudentIdAndStatus(String projectId, String studentId, String status);
    Optional<TranscriptPaymentRequest> findByProjectIdAndControlNumberIgnoreCase(String projectId, String controlNumber);
}
