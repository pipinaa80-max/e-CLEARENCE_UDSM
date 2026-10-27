package com.UDSM.BACKEND.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateStudentDebtFlagRequest(
        @NotBlank @Size(max = 50) String registrationNumber,
        @NotBlank @Size(max = 2000) String reason,
        @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal amount,
        @Size(max = 4000) String negotiationNotes
) {}
