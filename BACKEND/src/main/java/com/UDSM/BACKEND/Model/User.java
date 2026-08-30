package com.UDSM.BACKEND.Model;

import jakarta.persistence.*;
import lombok.Generated;
import lombok.Getter;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Setter
@Getter
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
    private boolean isActive = true;

    @Column(name = "is_email_verified")
    private boolean isEmailVerified = false;

    @Column(name = "is_locked")
    private boolean isLocked = false;

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
        this.isEmailVerified = false;
        this.isActive = true;
        this.isLocked = false;
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
        return !this.isLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return this.isActive && this.isEmailVerified;
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
        this.isLocked = true;
        this.lockReason = reason;
        this.lockTime = LocalDateTime.now();
    }

    /**
     * Unlock account
     */
    public void unlockAccount() {
        this.isLocked = false;
        this.lockReason = null;
        this.lockTime = null;
    }

    /**
     * Verify email
     */
    public void verifyEmail() {
        this.isEmailVerified = true;
        this.verificationToken = null;
        this.verificationTokenExpiry = null;
    }

    // =========================================================
    // BUILDER CLASS - FULLY UPDATED
    // =========================================================

    @Generated
    public static UserBuilder builder() {
        return new UserBuilder();
    }

    @Generated
    public static class UserBuilder {
        // Identity fields
        private String id;
        private String username;
        private String email;
        private String password;

        // Name fields
        private String fullName;
        private String firstName;
        private String middleName;
        private String lastName;

        // Academic fields
        private String registrationNumber;
        private String programme;
        private String college;
        private String department;
        private String academicYear;
        private String graduationYear;
        private String semester;
        private String yearOfStudy;

        // Contact fields
        private String phoneNumber;

        // Accommodation fields
        private String hall;
        private String roomNumber;
        private String sponsor;

        // Profile fields
        private String photo;

        // Role & Status
        private ERole role;
        private boolean isActive = true;
        private boolean isEmailVerified = false;
        private boolean isLocked = false;
        private String lockReason;
        private LocalDateTime lockTime;

        // Tokens
        private String resetToken;
        private LocalDateTime resetTokenExpiry;
        private String verificationToken;
        private LocalDateTime verificationTokenExpiry;

        // Timestamps
        private LocalDateTime lastLogin;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        // Audit
        private String createdBy;
        private String updatedBy;
        private String lastLoginIp;
        private String lastLoginDevice;

        // Builder methods
        @Generated
        public UserBuilder id(String id) {
            this.id = id;
            return this;
        }

        @Generated
        public UserBuilder username(String username) {
            this.username = username;
            return this;
        }

        @Generated
        public UserBuilder email(String email) {
            this.email = email;
            return this;
        }

        @Generated
        public UserBuilder password(String password) {
            this.password = password;
            return this;
        }

        @Generated
        public UserBuilder fullName(String fullName) {
            this.fullName = fullName;
            return this;
        }

        @Generated
        public UserBuilder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }

        @Generated
        public UserBuilder middleName(String middleName) {
            this.middleName = middleName;
            return this;
        }

        @Generated
        public UserBuilder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }

        @Generated
        public UserBuilder registrationNumber(String registrationNumber) {
            this.registrationNumber = registrationNumber;
            return this;
        }

        @Generated
        public UserBuilder programme(String programme) {
            this.programme = programme;
            return this;
        }

        @Generated
        public UserBuilder college(String college) {
            this.college = college;
            return this;
        }

        @Generated
        public UserBuilder department(String department) {
            this.department = department;
            return this;
        }

        @Generated
        public UserBuilder academicYear(String academicYear) {
            this.academicYear = academicYear;
            return this;
        }

        @Generated
        public UserBuilder graduationYear(String graduationYear) {
            this.graduationYear = graduationYear;
            return this;
        }

        @Generated
        public UserBuilder semester(String semester) {
            this.semester = semester;
            return this;
        }

        @Generated
        public UserBuilder yearOfStudy(String yearOfStudy) {
            this.yearOfStudy = yearOfStudy;
            return this;
        }

        @Generated
        public UserBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        @Generated
        public UserBuilder hall(String hall) {
            this.hall = hall;
            return this;
        }

        @Generated
        public UserBuilder roomNumber(String roomNumber) {
            this.roomNumber = roomNumber;
            return this;
        }

        @Generated
        public UserBuilder sponsor(String sponsor) {
            this.sponsor = sponsor;
            return this;
        }

        @Generated
        public UserBuilder photo(String photo) {
            this.photo = photo;
            return this;
        }

        @Generated
        public UserBuilder role(ERole role) {
            this.role = role;
            return this;
        }

        @Generated
        public UserBuilder isActive(boolean isActive) {
            this.isActive = isActive;
            return this;
        }

        @Generated
        public UserBuilder isEmailVerified(boolean isEmailVerified) {
            this.isEmailVerified = isEmailVerified;
            return this;
        }

        @Generated
        public UserBuilder isLocked(boolean isLocked) {
            this.isLocked = isLocked;
            return this;
        }

        @Generated
        public UserBuilder lockReason(String lockReason) {
            this.lockReason = lockReason;
            return this;
        }

        @Generated
        public UserBuilder lockTime(LocalDateTime lockTime) {
            this.lockTime = lockTime;
            return this;
        }

        @Generated
        public UserBuilder resetToken(String resetToken) {
            this.resetToken = resetToken;
            return this;
        }

        @Generated
        public UserBuilder resetTokenExpiry(LocalDateTime resetTokenExpiry) {
            this.resetTokenExpiry = resetTokenExpiry;
            return this;
        }

        @Generated
        public UserBuilder verificationToken(String verificationToken) {
            this.verificationToken = verificationToken;
            return this;
        }

        @Generated
        public UserBuilder verificationTokenExpiry(LocalDateTime verificationTokenExpiry) {
            this.verificationTokenExpiry = verificationTokenExpiry;
            return this;
        }

        @Generated
        public UserBuilder lastLogin(LocalDateTime lastLogin) {
            this.lastLogin = lastLogin;
            return this;
        }

        @Generated
        public UserBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        @Generated
        public UserBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        @Generated
        public UserBuilder createdBy(String createdBy) {
            this.createdBy = createdBy;
            return this;
        }

        @Generated
        public UserBuilder updatedBy(String updatedBy) {
            this.updatedBy = updatedBy;
            return this;
        }

        @Generated
        public UserBuilder lastLoginIp(String lastLoginIp) {
            this.lastLoginIp = lastLoginIp;
            return this;
        }

        @Generated
        public UserBuilder lastLoginDevice(String lastLoginDevice) {
            this.lastLoginDevice = lastLoginDevice;
            return this;
        }

        @Generated
        public User build() {
            User user = new User();
            user.setId(this.id);
            user.setUsername(this.username);
            user.setEmail(this.email);
            user.setPassword(this.password);
            user.setFullName(this.fullName != null ? this.fullName :
                    buildFullName(this.firstName, this.middleName, this.lastName));
            user.setFirstName(this.firstName);
            user.setMiddleName(this.middleName);
            user.setLastName(this.lastName);
            user.setRegistrationNumber(this.registrationNumber);
            user.setProgramme(this.programme);
            user.setCollege(this.college);
            user.setDepartment(this.department);
            user.setAcademicYear(this.academicYear);
            user.setGraduationYear(this.graduationYear);
            user.setSemester(this.semester);
            user.setYearOfStudy(this.yearOfStudy);
            user.setPhoneNumber(this.phoneNumber);
            user.setHall(this.hall);
            user.setRoomNumber(this.roomNumber);
            user.setSponsor(this.sponsor);
            user.setPhoto(this.photo);
            user.setRole(this.role);
            user.setActive(this.isActive);
            user.setEmailVerified(this.isEmailVerified);
            user.setLocked(this.isLocked);
            user.setLockReason(this.lockReason);
            user.setLockTime(this.lockTime);
            user.setResetToken(this.resetToken);
            user.setResetTokenExpiry(this.resetTokenExpiry);
            user.setVerificationToken(this.verificationToken);
            user.setVerificationTokenExpiry(this.verificationTokenExpiry);
            user.setLastLogin(this.lastLogin);
            user.setCreatedAt(this.createdAt != null ? this.createdAt : LocalDateTime.now());
            user.setUpdatedAt(this.updatedAt != null ? this.updatedAt : LocalDateTime.now());
            user.setCreatedBy(this.createdBy);
            user.setUpdatedBy(this.updatedBy);
            user.setLastLoginIp(this.lastLoginIp);
            user.setLastLoginDevice(this.lastLoginDevice);
            return user;
        }

        @Generated
        public String toString() {
            return "User.UserBuilder(id=" + this.id +
                    ", username=" + this.username +
                    ", email=" + this.email +
                    ", fullName=" + this.fullName +
                    ", firstName=" + this.firstName +
                    ", middleName=" + this.middleName +
                    ", lastName=" + this.lastName +
                    ", registrationNumber=" + this.registrationNumber +
                    ", programme=" + this.programme +
                    ", college=" + this.college +
                    ", department=" + this.department +
                    ", academicYear=" + this.academicYear +
                    ", graduationYear=" + this.graduationYear +
                    ", semester=" + this.semester +
                    ", yearOfStudy=" + this.yearOfStudy +
                    ", phoneNumber=" + this.phoneNumber +
                    ", hall=" + this.hall +
                    ", roomNumber=" + this.roomNumber +
                    ", sponsor=" + this.sponsor +
                    ", photo=" + this.photo +
                    ", role=" + this.role +
                    ", isActive=" + this.isActive +
                    ", isEmailVerified=" + this.isEmailVerified +
                    ", isLocked=" + this.isLocked +
                    ", lockReason=" + this.lockReason +
                    ", lockTime=" + this.lockTime +
                    ", resetToken=" + this.resetToken +
                    ", resetTokenExpiry=" + this.resetTokenExpiry +
                    ", verificationToken=" + this.verificationToken +
                    ", verificationTokenExpiry=" + this.verificationTokenExpiry +
                    ", lastLogin=" + this.lastLogin +
                    ", createdAt=" + this.createdAt +
                    ", updatedAt=" + this.updatedAt +
                    ", createdBy=" + this.createdBy +
                    ", updatedBy=" + this.updatedBy +
                    ", lastLoginIp=" + this.lastLoginIp +
                    ", lastLoginDevice=" + this.lastLoginDevice + ")";
        }
    }

    // =========================================================
    // CONSTRUCTORS
    // =========================================================

    @Generated
    public User() {
    }

    @Generated
    public User(String id, String username, String email, String password,
                String fullName, String firstName, String middleName, String lastName,
                String registrationNumber, String programme, String college, String department,
                String academicYear, String graduationYear, String semester, String yearOfStudy,
                String phoneNumber, String hall, String roomNumber, String sponsor, String photo,
                ERole role, boolean isActive, boolean isEmailVerified, boolean isLocked,
                String lockReason, LocalDateTime lockTime, String resetToken,
                LocalDateTime resetTokenExpiry, String verificationToken,
                LocalDateTime verificationTokenExpiry, LocalDateTime lastLogin,
                LocalDateTime createdAt, LocalDateTime updatedAt, String createdBy,
                String updatedBy, String lastLoginIp, String lastLoginDevice) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.firstName = firstName;
        this.middleName = middleName;
        this.lastName = lastName;
        this.registrationNumber = registrationNumber;
        this.programme = programme;
        this.college = college;
        this.department = department;
        this.academicYear = academicYear;
        this.graduationYear = graduationYear;
        this.semester = semester;
        this.yearOfStudy = yearOfStudy;
        this.phoneNumber = phoneNumber;
        this.hall = hall;
        this.roomNumber = roomNumber;
        this.sponsor = sponsor;
        this.photo = photo;
        this.role = role;
        this.isActive = isActive;
        this.isEmailVerified = isEmailVerified;
        this.isLocked = isLocked;
        this.lockReason = lockReason;
        this.lockTime = lockTime;
        this.resetToken = resetToken;
        this.resetTokenExpiry = resetTokenExpiry;
        this.verificationToken = verificationToken;
        this.verificationTokenExpiry = verificationTokenExpiry;
        this.lastLogin = lastLogin;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = createdBy;
        this.updatedBy = updatedBy;
        this.lastLoginIp = lastLoginIp;
        this.lastLoginDevice = lastLoginDevice;
    }

    // =========================================================
    // EQUALS, HASHCODE, TOSTRING
    // =========================================================

    @Generated
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof User)) return false;
        User other = (User) o;
        if (!other.canEqual(this)) return false;
        if (this.isActive() != other.isActive()) return false;
        if (this.isEmailVerified() != other.isEmailVerified()) return false;
        if (this.isLocked() != other.isLocked()) return false;

        Object this$id = this.getId();
        Object other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) return false;

        Object this$email = this.getEmail();
        Object other$email = other.getEmail();
        if (this$email == null ? other$email != null : !this$email.equals(other$email)) return false;

        Object this$registrationNumber = this.getRegistrationNumber();
        Object other$registrationNumber = other.getRegistrationNumber();
        if (this$registrationNumber == null ? other$registrationNumber != null :
                !this$registrationNumber.equals(other$registrationNumber)) return false;

        return true;
    }

    @Generated
    protected boolean canEqual(Object other) {
        return other instanceof User;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isActive() ? 79 : 97);
        result = result * 59 + (this.isEmailVerified() ? 79 : 97);
        result = result * 59 + (this.isLocked() ? 79 : 97);
        Object $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $email = this.getEmail();
        result = result * 59 + ($email == null ? 43 : $email.hashCode());
        Object $registrationNumber = this.getRegistrationNumber();
        result = result * 59 + ($registrationNumber == null ? 43 : $registrationNumber.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        return "User(id=" + this.getId() +
                ", email=" + this.getEmail() +
                ", fullName=" + this.getFullName() +
                ", firstName=" + this.getFirstName() +
                ", lastName=" + this.getLastName() +
                ", registrationNumber=" + this.getRegistrationNumber() +
                ", programme=" + this.getProgramme() +
                ", college=" + this.getCollege() +
                ", department=" + this.getDepartment() +
                ", role=" + this.getRole() +
                ", isActive=" + this.isActive() +
                ", isEmailVerified=" + this.isEmailVerified() +
                ", isLocked=" + this.isLocked() +
                ", createdAt=" + this.getCreatedAt() +
                ", updatedAt=" + this.getUpdatedAt() + ")";
    }
}