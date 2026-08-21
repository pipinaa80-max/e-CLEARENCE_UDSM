package com.UDSM.BACKEND.dto;

import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(Include.NON_NULL)
public class UserProfileResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("username")
    private String username;

    @JsonProperty("email")
    private String email;

    @JsonProperty("full_name")
    private String fullName;

    @JsonProperty("first_name")
    private String firstName;

    @JsonProperty("last_name")
    private String lastName;

    @JsonProperty("middle_name")
    private String middleName;

    @JsonProperty("registration_number")
    private String registrationNumber;

    @JsonProperty("role")
    private String role;

    @JsonProperty("is_active")
    private boolean isActive;

    @JsonProperty("phone_number")
    private String phoneNumber;

    @JsonProperty("department")
    private String department;

    @JsonProperty("college")
    private String college;

    @JsonProperty("programme")
    private String programme;

    @JsonProperty("hall")
    private String hall;

    @JsonProperty("room_number")
    private String roomNumber;

    @JsonProperty("sponsor")
    private String sponsor;

    @JsonProperty("photo")
    private String photo;

    @JsonProperty("academic_year")
    private String academicYear;

    @JsonProperty("graduation_year")
    private String graduationYear;

    @JsonProperty("semester")
    private String semester;

    @JsonProperty("last_login")
    private LocalDateTime lastLogin;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    @JsonProperty("clearance_status")
    private ClearanceStatus clearanceStatus;

    @JsonProperty("is_final_year")
    private boolean isFinalYear;

    // Helper method to create response from User and Student
    public static UserProfileResponse fromUserAndStudent(com.UDSM.BACKEND.Model.User user,
                                                         com.UDSM.BACKEND.Model.Student student) {
        UserProfileResponseBuilder builder = UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .middleName(user.getMiddleName())
                .registrationNumber(user.getRegistrationNumber())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .isActive(user.isActive())
                .phoneNumber(user.getPhoneNumber())
                .department(user.getDepartment())
                .college(user.getCollege())
                .programme(user.getProgramme())
                .hall(user.getHall())
                .roomNumber(user.getRoomNumber())
                .sponsor(user.getSponsor())
                .photo(user.getPhoto())
                .academicYear(user.getAcademicYear())
                .graduationYear(user.getGraduationYear())
                .semester(user.getSemester())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt());

        if (student != null) {
            builder.clearanceStatus(student.getClearanceStatus())
                    .isFinalYear(student.isFinalYear());
        }

        return builder.build();
    }
}