package com.UDSM.BACKEND.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TranscriptPaymentSubmitRequest(
        @NotBlank
        @Pattern(regexp = "[A-Za-z0-9-]{4,40}", message = "Enter a valid payment control number")
        String controlNumber
) { }
