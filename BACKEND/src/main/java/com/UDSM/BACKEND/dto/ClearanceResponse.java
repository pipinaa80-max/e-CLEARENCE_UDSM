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

    @JsonProperty("registration_number")
    private String registrationNumber;

    @JsonProperty("student_name")
    private String studentName;

    private String email;

    private String programme;
    private String faculty;
    private String department;

    private ClearanceStatus status;

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

    @JsonProperty("approvals")
    private List<DepartmentApprovalDTO> approvals;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DepartmentApprovalDTO {
        private String id;
        private String departmentName;
        private ClearanceStatus status;
        private String statusMessage;
        private String approvedBy;
        private LocalDateTime approvalDate;
        private String comments;
        private Integer order;
    }
}