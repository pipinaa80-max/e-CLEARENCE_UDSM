package com.UDSM.BACKEND.dto;

import com.UDSM.BACKEND.Model.TranscriptPaymentRequest;

import java.time.LocalDateTime;

public record TranscriptPaymentResponse(
        String id,
        String studentId,
        String studentName,
        String registrationNumber,
        int copies,
        int amountTzs,
        String controlNumber,
        String status,
        String rejectionReason,
        LocalDateTime submittedAt,
        LocalDateTime reviewedAt,
        String reviewedBy,
        String collectionMethod,
        String collectionAddress,
        String postingRegion,
        String postingWard,
        String postingPoBox,
        String contactPhone,
        String contactEmail
) {
    public static TranscriptPaymentResponse from(TranscriptPaymentRequest request) {
        return new TranscriptPaymentResponse(
                request.getId(), request.getStudentId(), request.getStudentName(), request.getRegistrationNumber(),
                request.getCopies(), request.getAmountTzs(), request.getControlNumber(), request.getStatus(),
                request.getRejectionReason(), request.getSubmittedAt(), request.getReviewedAt(), request.getReviewedBy(),
                request.getCollectionMethod(), request.getCollectionAddress(), request.getPostingRegion(),
                request.getPostingWard(), request.getPostingPoBox(), request.getContactPhone(), request.getContactEmail()
        );
    }
}
