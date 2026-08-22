package com.UDSM.BACKEND.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConvocationReceiptRequest {

    @NotBlank(message = "Student ID is required")
    private String studentId;

    @NotBlank(message = "Control number is required")
    private String controlNumber;

    @NotBlank(message = "Receipt number is required")
    private String receiptNumber;

    @NotBlank(message = "Payment date is required")
    private String paymentDate;

    private String fileName;
    private String fileType;
    private Long fileSize;
    private String description;
}