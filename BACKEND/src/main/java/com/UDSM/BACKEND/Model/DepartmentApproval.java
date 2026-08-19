

package com.UDSM.BACKEND.Model;

import com.UDSM.BACKEND.Model.ClearanceRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Generated;

@Entity
@Table(name = "department_approvals")
public class DepartmentApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "clearance_request_id", nullable = false)
    private ClearanceRequest clearanceRequest;

    @Column(name = "department", nullable = false)
    private String department;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private ClearanceStatus status;

    @Column(name = "approved_by")
    private String approvedBy;


    @Column(name = "approval_date")
    private LocalDateTime approvalDate;

    @Column(name = "comments")
    private String comments;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {

        this.updatedAt = LocalDateTime.now();
    }

    @Generated
    public static DepartmentApprovalBuilder builder() {

        return new DepartmentApprovalBuilder();
    }

    @Generated
    public String getId() {
        return this.id;
    }

    @Generated
    public ClearanceRequest getClearanceRequest() {
        return this.clearanceRequest;
    }

    @Generated
    public String getDepartment() {
        return this.department;
    }

    @Generated
    public ClearanceStatus getStatus() {
        return this.status;
    }

    @Generated
    public String getApprovedBy() {
        return this.approvedBy;
    }

    @Generated
    public LocalDateTime getApprovalDate() {
        return this.approvalDate;
    }

    @Generated
    public String getComments() {
        return this.comments;
    }

    @Generated
    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @Generated
    public LocalDateTime getUpdatedAt() {
        return this.updatedAt;
    }

    @Generated
    public void setId(String id) {
        this.id = id;
    }

    @Generated
    public void setClearanceRequest(ClearanceRequest clearanceRequest) {
        this.clearanceRequest = clearanceRequest;
    }

    @Generated
    public void setDepartment(String department) {
        this.department = department;
    }

    @Generated
    public void setStatus(ClearanceStatus status) {
        this.status = status;
    }

    @Generated
    public void setApprovedBy(String approvedBy) {
        this.approvedBy = approvedBy;
    }

    @Generated
    public void setApprovalDate(LocalDateTime approvalDate) {
        this.approvalDate = approvalDate;
    }

    @Generated
    public void setComments(String comments) {
        this.comments = comments;
    }

    @Generated
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Generated
    public boolean equals(Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof DepartmentApproval)) {
            return false;
        } else {
            DepartmentApproval other = (DepartmentApproval)o;
            if (!other.canEqual(this)) {
                return false;
            } else {
                Object this$id = this.getId();
                Object other$id = other.getId();
                if (this$id == null) {
                    if (other$id != null) {
                        return false;
                    }
                } else if (!this$id.equals(other$id)) {
                    return false;
                }

                Object this$clearanceRequest = this.getClearanceRequest();
                Object other$clearanceRequest = other.getClearanceRequest();
                if (this$clearanceRequest == null) {
                    if (other$clearanceRequest != null) {
                        return false;
                    }
                } else if (!this$clearanceRequest.equals(other$clearanceRequest)) {
                    return false;
                }

                Object this$department = this.getDepartment();
                Object other$department = other.getDepartment();
                if (this$department == null) {
                    if (other$department != null) {
                        return false;
                    }
                } else if (!this$department.equals(other$department)) {
                    return false;
                }

                Object this$status = this.getStatus();
                Object other$status = other.getStatus();
                if (this$status == null) {
                    if (other$status != null) {
                        return false;
                    }
                } else if (!this$status.equals(other$status)) {
                    return false;
                }

                Object this$approvedBy = this.getApprovedBy();
                Object other$approvedBy = other.getApprovedBy();
                if (this$approvedBy == null) {
                    if (other$approvedBy != null) {
                        return false;
                    }
                } else if (!this$approvedBy.equals(other$approvedBy)) {
                    return false;
                }

                Object this$approvalDate = this.getApprovalDate();
                Object other$approvalDate = other.getApprovalDate();
                if (this$approvalDate == null) {
                    if (other$approvalDate != null) {
                        return false;
                    }
                } else if (!this$approvalDate.equals(other$approvalDate)) {
                    return false;
                }

                Object this$comments = this.getComments();
                Object other$comments = other.getComments();
                if (this$comments == null) {
                    if (other$comments != null) {
                        return false;
                    }
                } else if (!this$comments.equals(other$comments)) {
                    return false;
                }

                Object this$createdAt = this.getCreatedAt();
                Object other$createdAt = other.getCreatedAt();
                if (this$createdAt == null) {
                    if (other$createdAt != null) {
                        return false;
                    }
                } else if (!this$createdAt.equals(other$createdAt)) {
                    return false;
                }

                Object this$updatedAt = this.getUpdatedAt();
                Object other$updatedAt = other.getUpdatedAt();
                if (this$updatedAt == null) {
                    if (other$updatedAt != null) {
                        return false;
                    }
                } else if (!this$updatedAt.equals(other$updatedAt)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(Object other) {
        return other instanceof DepartmentApproval;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $clearanceRequest = this.getClearanceRequest();
        result = result * 59 + ($clearanceRequest == null ? 43 : $clearanceRequest.hashCode());
        Object $department = this.getDepartment();
        result = result * 59 + ($department == null ? 43 : $department.hashCode());
        Object $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        Object $approvedBy = this.getApprovedBy();
        result = result * 59 + ($approvedBy == null ? 43 : $approvedBy.hashCode());
        Object $approvalDate = this.getApprovalDate();
        result = result * 59 + ($approvalDate == null ? 43 : $approvalDate.hashCode());
        Object $comments = this.getComments();
        result = result * 59 + ($comments == null ? 43 : $comments.hashCode());
        Object $createdAt = this.getCreatedAt();
        result = result * 59 + ($createdAt == null ? 43 : $createdAt.hashCode());
        Object $updatedAt = this.getUpdatedAt();
        result = result * 59 + ($updatedAt == null ? 43 : $updatedAt.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getId();
        return "DepartmentApproval(id=" + var10000 + ", clearanceRequest=" + String.valueOf(this.getClearanceRequest()) + ", department=" + this.getDepartment() + ", status=" + String.valueOf(this.getStatus()) + ", approvedBy=" + this.getApprovedBy() + ", approvalDate=" + String.valueOf(this.getApprovalDate()) + ", comments=" + this.getComments() + ", createdAt=" + String.valueOf(this.getCreatedAt()) + ", updatedAt=" + String.valueOf(this.getUpdatedAt()) + ")";
    }

    @Generated
    public DepartmentApproval() {
        this.status = ClearanceStatus.PENDING;
    }

    @Generated
    public DepartmentApproval(String id, ClearanceRequest clearanceRequest, String department, ClearanceStatus status, String approvedBy, LocalDateTime approvalDate, String comments, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.status = ClearanceStatus.PENDING;
        this.id = id;
        this.clearanceRequest = clearanceRequest;
        this.department = department;
        this.status = status;
        this.approvedBy = approvedBy;
        this.approvalDate = approvalDate;
        this.comments = comments;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @Generated
    public static class DepartmentApprovalBuilder {
        @Generated
        private String id;
        @Generated
        private ClearanceRequest clearanceRequest;
        @Generated
        private String department;
        @Generated
        private ClearanceStatus status;
        @Generated
        private String approvedBy;
        @Generated
        private LocalDateTime approvalDate;
        @Generated
        private String comments;
        @Generated
        private LocalDateTime createdAt;
        @Generated
        private LocalDateTime updatedAt;

        @Generated
        DepartmentApprovalBuilder() {
        }

        @Generated
        public DepartmentApprovalBuilder id(String id) {
            this.id = id;
            return this;
        }

        @Generated
        public DepartmentApprovalBuilder clearanceRequest() {
            this.clearanceRequest = clearanceRequest;
            return this;
        }

        @Generated
        public DepartmentApprovalBuilder department(String department) {
            this.department = department;
            return this;
        }

        @Generated
        public DepartmentApprovalBuilder status(ClearanceStatus status) {
            this.status = status;
            return this;
        }

        @Generated
        public DepartmentApprovalBuilder approvedBy(String approvedBy) {
            this.approvedBy = approvedBy;
            return this;
        }

        @Generated
        public DepartmentApprovalBuilder approvalDate(LocalDateTime approvalDate) {
            this.approvalDate = approvalDate;
            return this;
        }

        @Generated
        public DepartmentApprovalBuilder comments(String comments) {
            this.comments = comments;
            return this;
        }

        @Generated
        public DepartmentApprovalBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        @Generated
        public DepartmentApprovalBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        @Generated
        public DepartmentApproval build() {
            return new DepartmentApproval(this.id, this.clearanceRequest, this.department, this.status, this.approvedBy, this.approvalDate, this.comments, this.createdAt, this.updatedAt);
        }

        @Generated
        public String toString() {
            String var10000 = this.id;
            return "DepartmentApproval.DepartmentApprovalBuilder(id=" + var10000 + ", clearanceRequest=" + String.valueOf(this.clearanceRequest) + ", department=" + this.department + ", status=" + String.valueOf(this.status) + ", approvedBy=" + this.approvedBy + ", approvalDate=" + String.valueOf(this.approvalDate) + ", comments=" + this.comments + ", createdAt=" + String.valueOf(this.createdAt) + ", updatedAt=" + String.valueOf(this.updatedAt) + ")";
        }
    }
}
