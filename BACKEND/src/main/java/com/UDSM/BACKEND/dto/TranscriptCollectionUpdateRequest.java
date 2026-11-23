package com.UDSM.BACKEND.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TranscriptCollectionUpdateRequest(
        @NotBlank @Pattern(regexp = "Physical Collection|Post by DHL") String collectionMethod,
        @NotBlank @Size(max = 1000) String collectionAddress,
        @Size(max = 100) String postingRegion,
        @Size(max = 100) String postingWard,
        @Size(max = 100) String postingPoBox,
        @Size(max = 40) String contactPhone,
        @Email @Size(max = 255) String contactEmail
) { }
