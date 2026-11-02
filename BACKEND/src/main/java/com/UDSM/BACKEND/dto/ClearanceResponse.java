package com.UDSM.BACKEND.dto;

import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ClearanceResponse {

    @JsonProperty("id")
    private String requestId;

    @JsonProperty("student_id")
    private String studentId;

    @JsonProperty("studentId")
    public String getStudentIdCamel() {
        return studentId;
    }

    @JsonProperty("registration_number")
    private String registrationNumber;

    @JsonProperty("registrationNumber")
    public String getRegistrationNumberCamel() {
        return registrationNumber;
    }

    @JsonProperty("student_name")
    private String studentName;

    @JsonProperty("studentName")
    public String getStudentNameCamel() {
        return studentName;
    }

    private String email;

    @JsonProperty("phone_number")
    private String phoneNumber;

    @JsonProperty("phoneNumber")
    public String getPhoneNumberCamel() {
        return phoneNumber;
    }

    private String programme;
    private String faculty;
    private String college;
    private String department;
    private String address;

    @JsonProperty("physical_address")
    private String physicalAddress;

    @JsonProperty("physicalAddress")
    public String getPhysicalAddressCamel() {
        return physicalAddress;
    }

    private String hall;
    private String wing;
    private String block;

    @JsonProperty("room_number")
    private String roomNumber;

    @JsonProperty("roomNumber")
    public String getRoomNumberCamel() {
        return roomNumber;
    }

    private String sponsor;
    private String photo;

    private ClearanceStatus status;

    @JsonProperty("current_stage")
    private String currentStage;

    @JsonProperty("currentStage")
    public String getCurrentStageCamel() {
        return currentStage;
    }

    @JsonProperty("current_office")
    private String currentOffice;

    @JsonProperty("currentOffice")
    public String getCurrentOfficeCamel() {
        return currentOffice;
    }

    @JsonProperty("status_message")
    private String statusMessage;

    @JsonProperty("progress_percentage")
    private int progressPercentage;

    @JsonProperty("total_departments")
    private int totalDepartments;

    @JsonProperty("approved_count")
    private int approvedCount;

    @JsonProperty("pending_count")
    private int pendingCount;

    @JsonProperty("rejected_count")
    private int rejectedCount;

    @JsonProperty("completed_count")
    private int completedCount;

    @JsonProperty("request_date")
    private LocalDateTime requestDate;

    @JsonProperty("requestDate")
    public LocalDateTime getRequestDateCamel() {
        return requestDate;
    }

    @JsonProperty("approvals")
    private List<DepartmentApprovalDTO> approvals;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DepartmentApprovalDTO {
        private String id;

        @JsonProperty("department_name")
        private String departmentName;

        @JsonProperty("office")
        public String getOffice() {
            return departmentName;
        }

        public void setOffice(String office) {
            this.departmentName = office;
        }

        private ClearanceStatus status;

        @JsonProperty("status_message")
        private String statusMessage;

        @JsonProperty("approved_by")
        private String approvedBy;

        @JsonProperty("reviewedBy")
        public String getReviewedBy() {
            return approvedBy;
        }

        public void setReviewedBy(String reviewedBy) {
            this.approvedBy = reviewedBy;
        }

        @JsonProperty("approval_date")
        private LocalDateTime approvalDate;

        @JsonProperty("reviewedAt")
        public LocalDateTime getReviewedAt() {
            return approvalDate;
        }

        public void setReviewedAt(LocalDateTime reviewedAt) {
            this.approvalDate = reviewedAt;
        }

        private String comments;

        @JsonProperty("comment")
        public String getComment() {
            return comments;
        }

        public void setComment(String comment) {
            this.comments = comment;
        }

        private Integer order;
    }
}
