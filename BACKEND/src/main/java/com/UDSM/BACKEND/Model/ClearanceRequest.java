package com.UDSM.BACKEND.Model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "clearance_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClearanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "student_id", insertable = false, updatable = false)
    private String studentId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "current_stage")
    private String currentStage;

    @Column(name = "current_office")
    private String currentOffice;

    @OneToMany(mappedBy = "clearanceRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private java.util.List<DepartmentApproval> departmentApprovals = new java.util.ArrayList<>();

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "college")
    private String college;

    @Column(name = "department")
    private String department;

    @Column(name = "programme")
    private String programme;

    @Column(name = "wing")
    private String wing;

    @Column(name = "block")
    private String block;

    @Column(name = "address")
    private String address;

    @Column(name = "physical_address")
    private String physicalAddress;

    @Column(name = "project_id", length = 100)
    private String projectId;

    @Column(name = "certificate_verified")
    @Builder.Default
    private Boolean certificateVerified = false;

    @Column(name = "certificate_verified_at")
    private LocalDateTime certificateVerifiedAt;

    @Column(name = "digital_signature_hash")
    private String digitalSignatureHash;

    @Column(name = "signed_by")
    private String signedBy;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @Column(name = "dispatch_status", length = 50)
    @Builder.Default
    private String dispatchStatus = "Pending Dispatch";

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ClearanceStatus.PENDING.name();
        }
        if (currentStage == null) {
            currentStage = "Convocation";
        }
        if (currentOffice == null) {
            currentOffice = "Convocation";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // =========================================================
    // CONVENIENCE METHODS
    // =========================================================

    public void setCurrentStage(String stage) {
        this.currentStage = stage;
        this.currentOffice = stage;
    }

    public void setCurrentOffice(String office) {
        this.currentOffice = office;
    }

    public boolean isPending() {
        return ClearanceStatus.PENDING.name().equals(status);
    }

    public boolean isApproved() {
        return ClearanceStatus.APPROVED.name().equals(status);
    }

    public boolean isRejected() {
        return ClearanceStatus.REJECTED.name().equals(status);
    }

    public boolean isCompleted() {
        return ClearanceStatus.COMPLETED.name().equals(status) ||
                ClearanceStatus.CLEARED.name().equals(status);
    }

    public boolean isAtConvocationStage() {
        return "Convocation".equals(currentStage);
    }

    public boolean isAtParallelStage() {
        return "Parallel".equals(currentStage);
    }

    public boolean isAtDepartmentStage() {
        return "Department".equals(currentStage);
    }

    public boolean isAtPrincipalStage() {
        return "Principal".equals(currentStage);
    }

    public boolean isAtFinanceStage() {
        return "Finance".equals(currentStage);
    }

    public void moveToNextStage() {
        if (isAtConvocationStage()) {
            setCurrentStage("Parallel");
        } else if (isAtParallelStage()) {
            setCurrentStage("Department");
        } else if (isAtDepartmentStage()) {
            setCurrentStage("Principal");
        } else if (isAtPrincipalStage()) {
            setCurrentStage("Finance");
        } else if (isAtFinanceStage()) {
            setCurrentStage("Completed");
            status = ClearanceStatus.COMPLETED.name();
        }
    }
}