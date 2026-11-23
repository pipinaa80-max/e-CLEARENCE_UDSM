package com.UDSM.BACKEND.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TranscriptPaymentDecisionRequest(
        @NotBlank @Size(min = 5, max = 500) String reason
) { }
