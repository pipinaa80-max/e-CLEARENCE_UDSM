package com.UDSM.BACKEND.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transcript_payment_requests")
@Getter
@Setter
@NoArgsConstructor
public class TranscriptPaymentRequest {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "project_id", length = 100, nullable = false)
    private String projectId;

    @Column(name = "student_id", length = 255, nullable = false)
    private String studentId;

    @Column(name = "active_student_id", length = 255)
    private String activeStudentId;

    @Column(name = "student_name", length = 255, nullable = false)
    private String studentName;

    @Column(name = "registration_number", length = 100, nullable = false)
    private String registrationNumber;

    @Column(name = "copies", nullable = false)
    private int copies;

    @Column(name = "amount_tzs", nullable = false)
    private int amountTzs;

    @Column(name = "control_number", length = 40, nullable = false)
    private String controlNumber;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by", length = 255)
    private String reviewedBy;

    @Column(name = "collection_method", length = 30)
    private String collectionMethod;

    @Column(name = "collection_address", length = 1000)
    private String collectionAddress;

    @Column(name = "posting_region", length = 100)
    private String postingRegion;

    @Column(name = "posting_ward", length = 100)
    private String postingWard;

    @Column(name = "posting_po_box", length = 100)
    private String postingPoBox;

    @Column(name = "contact_phone", length = 40)
    private String contactPhone;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID().toString();
        if (submittedAt == null) submittedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        if (status == null) status = "PENDING";
    }
}
