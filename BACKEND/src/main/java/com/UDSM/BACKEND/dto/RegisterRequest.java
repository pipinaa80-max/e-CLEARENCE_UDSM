// com/UDSM/BACKEND/dto/RegisterRequest.java
package com.UDSM.BACKEND.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@Builder
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    // ========== FRONTEND SENDS THESE EXACT FIELD NAMES ==========

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String lastName;

    private String middleName;

    @NotBlank(message = "Registration number is required")
    private String registrationNumber;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @NotBlank(message = "Phone number is required")
    // @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "Phone number must be in international format, e.g. +255712345678")
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    private String password;  // ← Matches frontend 'password'

    @NotBlank(message = "Role is required")
    private String role;  // ← Matches frontend 'role'

    // ========== OPTIONAL STUDENT DETAILS ==========
    private String programme;
    private String faculty;
    private String college;
    private String department;
    private String yearOfStudy;
    private String academicYear;
}