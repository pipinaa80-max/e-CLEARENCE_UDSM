package com.UDSM.BACKEND.Model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "department_approvals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "clearance_request_id")
    private ClearanceRequest clearanceRequest;

    @Column(nullable = false)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClearanceStatus status;

    private String approvedBy;

    private LocalDateTime approvalDate;

    private String comments;

    private Integer orderNumber;  // Add this field for ordering

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = ClearanceStatus.PENDING;
        }
        if (orderNumber == null) {
            orderNumber = 0;
        }
    }
}