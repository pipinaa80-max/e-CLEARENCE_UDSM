package com.UDSM.BACKEND.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClearanceRequestDTO {

    @NotBlank(message = "Registration number is required")
    @Size(min = 5, max = 50, message = "Registration number must be between 5 and 50 characters")
    private String registrationNumber;

    @NotBlank(message = "Student name is required")
    @Size(min = 2, max = 100, message = "Student name must be between 2 and 100 characters")
    private String studentName;

    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phoneNumber;

    @NotBlank(message = "Programme is required")
    private String programme;

    @NotBlank(message = "College/Faculty is required")
    private String college;  // Changed from 'faculty' to 'college' to match frontend

    @NotBlank(message = "Department is required")
    private String department;

    @NotBlank(message = "Academic year is required")
    private String academicYear;

    @NotBlank(message = "Hall is required")
    private String hall;

    private String roomNumber;

    private String sponsor;

    private String photo;

    private boolean confirm;
}