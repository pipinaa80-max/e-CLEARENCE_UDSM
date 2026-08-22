package com.UDSM.BACKEND.dto;
import com.UDSM.BACKEND.Model.ClearanceStatus;
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
public class ConvocationReceiptResponse {
    private List<ReceiptDTO> receipts;
    private int pendingCount;
    private int approvedCount;
    private int rejectedCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReceiptDTO {
        private String id;
        private String studentId;
        private String studentName;
        private String registrationNumber;
        private String programme;
        private String department;
        private String college;
        private String controlNumber;
        private String receiptNumber;
        private String paymentDate;
        private String fileUrl;
        private ClearanceStatus status;
        private String approvedBy;
        private LocalDateTime approvedAt;
        private String comments;
        private LocalDateTime submittedAt;
    }
}