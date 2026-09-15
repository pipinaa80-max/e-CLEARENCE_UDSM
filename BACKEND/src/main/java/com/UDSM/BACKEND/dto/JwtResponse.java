package com.UDSM.BACKEND.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(Include.NON_NULL)
public class JwtResponse {
    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("refresh_token")
    private String refreshToken;

    @JsonProperty("token_type")
    @Builder.Default
    private String tokenType = "Bearer";

    @JsonProperty("expires_in")
    private long expiresIn;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("username")
    private String username;

    @JsonProperty("email")
    private String email;

    @JsonProperty("full_name")
    private String fullName;

    @JsonProperty("registration_number")
    private String registrationNumber;

    @JsonProperty("role")
    private String role;

    @JsonProperty("is_active")
    private boolean isActive;

    @JsonProperty("last_login")
    private LocalDateTime lastLogin;

    @JsonProperty("permissions")
    private List<String> permissions;

    @JsonProperty("department")
    private String department;

    @JsonProperty("faculty")
    private String faculty;

    @JsonProperty("programme")
    private String programme;

    @JsonProperty("photo")
    private String photo;
}
