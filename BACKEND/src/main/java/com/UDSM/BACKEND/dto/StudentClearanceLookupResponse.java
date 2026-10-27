package com.UDSM.BACKEND.dto;

public record StudentClearanceLookupResponse(
        String registrationNumber,
        String studentName,
        String college,
        String department,
        String clearanceStatus,
        String currentStage,
        boolean cleared
) {}
