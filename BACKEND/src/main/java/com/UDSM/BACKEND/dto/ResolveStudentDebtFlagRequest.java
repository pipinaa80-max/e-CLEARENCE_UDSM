package com.UDSM.BACKEND.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResolveStudentDebtFlagRequest(
        @NotBlank @Size(max = 2000) String resolutionNote
) {}
