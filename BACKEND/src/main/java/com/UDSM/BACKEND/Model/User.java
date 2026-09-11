package com.UDSM.BACKEND.Model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    private String fullName;

    // ========== NAME FIELDS ==========
    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "middle_name")
    private String middleName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    // ========== STUDENT/ACADEMIC FIELDS ==========
    @Column(name = "registration_number", unique = true)
    private String registrationNumber;

    @Column(name = "programme")
    private String programme;

    @Column(name = "college")
    private String college;

    @Column(name = "department")
    private String department;

    @Column(name = "academic_year")
    private String academicYear;

    @Column(name = "graduation_year")
    private String graduationYear;

    @Column(name = "semester")
    private String semester;

    @Column(name = "year_of_study")
    private String yearOfStudy;

    // ========== CONTACT FIELDS ==========
    @Column(name = "phone_number")
    private String phoneNumber;

    // ========== ACCOMMODATION FIELDS ==========
    @Column(name = "hall")
    private String hall;

    @Column(name = "room_number")
    private String roomNumber;

    @Column(name = "sponsor")
    private String sponsor;

    // ========== PROFILE FIELDS ==========
    @Column(name = "photo")
    private String photo;

    // ========== ROLE & STATUS FIELDS ==========
    @Enumerated(EnumType.STRING)
    private ERole role;

    @Column(name = "is_active")
    @JsonProperty("isActive")
    private boolean active = false;

    @Column(name = "is_email_verified")
    @JsonProperty("isEmailVerified")
    private boolean emailVerified = false;

    @Column(name = "is_locked")
    @JsonProperty("isLocked")
    private boolean locked = false;

    @Column(name = "lock_reason")
    private String lockReason;

    @Column(name = "lock_time")
    private LocalDateTime lockTime;

    // ========== TOKEN FIELDS ==========
    // Reset Password Token
    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    // Email Verification Token
    @Column(name = "verification_token")
    private String verificationToken;

    @Column(name = "verification_token_expiry")
    private LocalDateTime verificationTokenExpiry;

    // ========== TIMESTAMP FIELDS ==========
    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ========== AUDIT FIELDS ==========
    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "project_id", length = 100)
    private String projectId;

    @Column(name = "last_login_ip")
    private String lastLoginIp;

    @Column(name = "last_login_device")
    private String lastLoginDevice;

    // =========================================================
    // JPA LIFE CYCLE CALLBACKS
    // =========================================================

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.locked = false;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // =========================================================
    // SPRING SECURITY METHODS
    // =========================================================

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (this.role == null) return List.of();
        return List.of(new SimpleGrantedAuthority("ROLE_" + this.role.name()));
    }

    @Override
    public String getUsername() {
        return this.email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !this.locked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return this.active;
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    /**
     * Build full name from first, middle, and last name
     */
    public static String buildFullName(String firstName, String middleName, String lastName) {
        StringBuilder fullName = new StringBuilder();
        if (firstName != null && !firstName.isEmpty()) {
            fullName.append(firstName);
        }
        if (middleName != null && !middleName.isEmpty()) {
            if (fullName.length() > 0) fullName.append(" ");
            fullName.append(middleName);
        }
        if (lastName != null && !lastName.isEmpty()) {
            if (fullName.length() > 0) fullName.append(" ");
            fullName.append(lastName);
        }
        return fullName.toString();
    }

    /**
     * Check if reset token is valid
     */
    public boolean isValidResetToken() {
        return resetToken != null &&
                resetTokenExpiry != null &&
                resetTokenExpiry.isAfter(LocalDateTime.now());
    }

    /**
     * Check if verification token is valid
     */
    public boolean isValidVerificationToken() {
        return verificationToken != null &&
                verificationTokenExpiry != null &&
                verificationTokenExpiry.isAfter(LocalDateTime.now());
    }

    /**
     * Clear all tokens
     */
    public void clearTokens() {
        this.resetToken = null;
        this.resetTokenExpiry = null;
        this.verificationToken = null;
        this.verificationTokenExpiry = null;
    }

    /**
     * Lock account
     */
    public void lockAccount(String reason) {
        this.locked = true;
        this.lockReason = reason;
        this.lockTime = LocalDateTime.now();
    }

    /**
     * Unlock account
     */
    public void unlockAccount() {
        this.locked = false;
        this.lockReason = null;
        this.lockTime = null;
    }

    /**
     * Verify email
     */
    public void verifyEmail() {
        this.emailVerified = true;
        this.verificationToken = null;
        this.verificationTokenExpiry = null;
    }
}
