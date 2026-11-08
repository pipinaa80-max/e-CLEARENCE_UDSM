package com.UDSM.BACKEND.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConvocationReceiptRequest {

    private String studentId;
    private String studentName;
    private String registrationNumber;
    private String controlNumber;
    private String receiptNumber;
    private String paymentDate;
    private String paymentChannel;
    private Double amountPaid;
    private String semester;
    private String academicYear;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String description;
}
