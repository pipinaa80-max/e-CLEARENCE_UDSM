package com.UDSM.BACKEND.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProfileUpdateRequest {

    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    private String firstName;

    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    private String lastName;

    @Size(min = 2, max = 50, message = "Middle name must be between 2 and 50 characters")
    private String middleName;

    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Email(message = "Invalid email format")
    private String email;

    @Size(min = 10, max = 15, message = "Phone number must be between 10 and 15 characters")
    private String phoneNumber;

    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String department;
    private String registrationNumber;
    private String college;
    private String programme;
    private String hall;
    private String roomNumber;
    private String sponsor;
    private String photo;
    private String academicYear;
    private String graduationYear;
    private String semester;
}