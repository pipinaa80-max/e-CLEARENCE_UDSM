package com.UDSM.BACKEND.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import lombok.Generated;
import lombok.Getter;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

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

    // ========== NEW FIELDS ==========
    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "middle_name")
    private String middleName;

    @Column(name = "last_name", nullable = false)
    private String lastName;
    // =================================

    @Column(name = "registration_number")
    private String registrationNumber;

    @Enumerated(EnumType.STRING)
    private ERole role;

    @Column(name = "is_active")
    private boolean isActive = true;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "department")
    private String department;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

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
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return this.isActive;
    }

    // ========== ADD GETTERS FOR NEW FIELDS ==========
    public String getFirstName() {
        return firstName;
    }

    public String getMiddleName() {
        return middleName;
    }

    public String getLastName() {
        return lastName;
    }

    // ========== ADD SETTERS FOR NEW FIELDS ==========
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public void setMiddleName(String middleName) {
        this.middleName = middleName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    // ========== FIX: Use getPhoneNumber() not getphoneNumber() ==========
    public String getPhoneNumber() {
        return this.phoneNumber;
    }

    // ========== Helper method to build full name ==========
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

    // ========== BUILDER - FIXED WITH ALL FIELDS ==========
    @Generated
    public static UserBuilder builder() {
        return new UserBuilder();
    }

    @Generated
    public static class UserBuilder {
        @Generated
        private String id;
        @Generated
        private String username;
        @Generated
        private String email;
        @Generated
        private String password;
        @Generated
        private String fullName;

        // ========== ADD NEW FIELDS TO BUILDER ==========
        @Generated
        private String firstName;
        @Generated
        private String middleName;
        @Generated
        private String lastName;
        // ==============================================

        @Generated
        private String registrationNumber;
        @Generated
        private ERole role;
        @Generated
        private boolean isActive;
        @Generated
        private LocalDateTime lastLogin;
        @Generated
        private LocalDateTime createdAt;
        @Generated
        private LocalDateTime updatedAt;
        @Generated
        private String phoneNumber;
        @Generated
        private String department;

        @Generated
        UserBuilder() {
        }

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

        // ========== ADD BUILDER METHODS FOR NEW FIELDS ==========
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
        // ========================================================

        @Generated
        public UserBuilder registrationNumber(String registrationNumber) {
            this.registrationNumber = registrationNumber;
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
        public UserBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        @Generated
        public UserBuilder department(String department) {
            this.department = department;
            return this;
        }

        @Generated
        public User build() {
            User user = new User();
            user.setId(this.id);
            user.setUsername(this.username);
            user.setEmail(this.email);
            user.setPassword(this.password);
            user.setFullName(this.fullName);
            // ========== SET NEW FIELDS ==========
            user.setFirstName(this.firstName);
            user.setMiddleName(this.middleName);
            user.setLastName(this.lastName);
            // ====================================
            user.setRegistrationNumber(this.registrationNumber);
            user.setRole(this.role);
            user.setActive(this.isActive);
            user.setLastLogin(this.lastLogin);
            user.setCreatedAt(this.createdAt);
            user.setUpdatedAt(this.updatedAt);
            user.setPhoneNumber(this.phoneNumber);
            user.setDepartment(this.department);
            return user;
        }

        @Generated
        public String toString() {
            return "User.UserBuilder(id=" + this.id +
                    ", username=" + this.username +
                    ", email=" + this.email +
                    ", password=" + this.password +
                    ", fullName=" + this.fullName +
                    ", firstName=" + this.firstName +
                    ", middleName=" + this.middleName +
                    ", lastName=" + this.lastName +
                    ", registrationNumber=" + this.registrationNumber +
                    ", role=" + String.valueOf(this.role) +
                    ", isActive=" + this.isActive +
                    ", lastLogin=" + String.valueOf(this.lastLogin) +
                    ", createdAt=" + String.valueOf(this.createdAt) +
                    ", updatedAt=" + String.valueOf(this.updatedAt) +
                    ", phoneNumber=" + this.phoneNumber +
                    ", department=" + this.department + ")";
        }
    }

    // ========== CONSTRUCTORS - FIXED ==========
    @Generated
    public User() {
    }

    @Generated
    public User(String id, String username, String email, String password, String fullName,
                String firstName, String middleName, String lastName,
                String registrationNumber, ERole role, boolean isActive,
                LocalDateTime lastLogin, LocalDateTime createdAt, LocalDateTime updatedAt,
                String phoneNumber, String department) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.firstName = firstName;
        this.middleName = middleName;
        this.lastName = lastName;
        this.registrationNumber = registrationNumber;
        this.role = role;
        this.isActive = isActive;
        this.lastLogin = lastLogin;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.phoneNumber = phoneNumber;
        this.department = department;
    }

    // ========== EQUALS, HASHCODE, TOSTRING - UPDATED ==========
    @Generated
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof User)) return false;
        User other = (User) o;
        if (!other.canEqual(this)) return false;
        if (this.isActive() != other.isActive()) return false;

        Object this$id = this.getId();
        Object other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) return false;

        Object this$username = this.getUsername();
        Object other$username = other.getUsername();
        if (this$username == null ? other$username != null : !this$username.equals(other$username)) return false;

        Object this$email = this.getEmail();
        Object other$email = other.getEmail();
        if (this$email == null ? other$email != null : !this$email.equals(other$email)) return false;

        Object this$password = this.getPassword();
        Object other$password = other.getPassword();
        if (this$password == null ? other$password != null : !this$password.equals(other$password)) return false;

        Object this$fullName = this.getFullName();
        Object other$fullName = other.getFullName();
        if (this$fullName == null ? other$fullName != null : !this$fullName.equals(other$fullName)) return false;

        Object this$firstName = this.getFirstName();
        Object other$firstName = other.getFirstName();
        if (this$firstName == null ? other$firstName != null : !this$firstName.equals(other$firstName)) return false;

        Object this$middleName = this.getMiddleName();
        Object other$middleName = other.getMiddleName();
        if (this$middleName == null ? other$middleName != null : !this$middleName.equals(other$middleName)) return false;

        Object this$lastName = this.getLastName();
        Object other$lastName = other.getLastName();
        if (this$lastName == null ? other$lastName != null : !this$lastName.equals(other$lastName)) return false;

        Object this$registrationNumber = this.getRegistrationNumber();
        Object other$registrationNumber = other.getRegistrationNumber();
        if (this$registrationNumber == null ? other$registrationNumber != null : !this$registrationNumber.equals(other$registrationNumber)) return false;

        Object this$role = this.getRole();
        Object other$role = other.getRole();
        if (this$role == null ? other$role != null : !this$role.equals(other$role)) return false;

        Object this$lastLogin = this.getLastLogin();
        Object other$lastLogin = other.getLastLogin();
        if (this$lastLogin == null ? other$lastLogin != null : !this$lastLogin.equals(other$lastLogin)) return false;

        Object this$createdAt = this.getCreatedAt();
        Object other$createdAt = other.getCreatedAt();
        if (this$createdAt == null ? other$createdAt != null : !this$createdAt.equals(other$createdAt)) return false;

        Object this$updatedAt = this.getUpdatedAt();
        Object other$updatedAt = other.getUpdatedAt();
        if (this$updatedAt == null ? other$updatedAt != null : !this$updatedAt.equals(other$updatedAt)) return false;

        Object this$phoneNumber = this.getPhoneNumber();
        Object other$phoneNumber = other.getPhoneNumber();
        if (this$phoneNumber == null ? other$phoneNumber != null : !this$phoneNumber.equals(other$phoneNumber)) return false;

        Object this$department = this.getDepartment();
        Object other$department = other.getDepartment();
        if (this$department == null ? other$department != null : !this$department.equals(other$department)) return false;

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
        Object $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $username = this.getUsername();
        result = result * 59 + ($username == null ? 43 : $username.hashCode());
        Object $email = this.getEmail();
        result = result * 59 + ($email == null ? 43 : $email.hashCode());
        Object $password = this.getPassword();
        result = result * 59 + ($password == null ? 43 : $password.hashCode());
        Object $fullName = this.getFullName();
        result = result * 59 + ($fullName == null ? 43 : $fullName.hashCode());
        Object $firstName = this.getFirstName();
        result = result * 59 + ($firstName == null ? 43 : $firstName.hashCode());
        Object $middleName = this.getMiddleName();
        result = result * 59 + ($middleName == null ? 43 : $middleName.hashCode());
        Object $lastName = this.getLastName();
        result = result * 59 + ($lastName == null ? 43 : $lastName.hashCode());
        Object $registrationNumber = this.getRegistrationNumber();
        result = result * 59 + ($registrationNumber == null ? 43 : $registrationNumber.hashCode());
        Object $role = this.getRole();
        result = result * 59 + ($role == null ? 43 : $role.hashCode());
        Object $lastLogin = this.getLastLogin();
        result = result * 59 + ($lastLogin == null ? 43 : $lastLogin.hashCode());
        Object $createdAt = this.getCreatedAt();
        result = result * 59 + ($createdAt == null ? 43 : $createdAt.hashCode());
        Object $updatedAt = this.getUpdatedAt();
        result = result * 59 + ($updatedAt == null ? 43 : $updatedAt.hashCode());
        Object $phoneNumber = this.getPhoneNumber();
        result = result * 59 + ($phoneNumber == null ? 43 : $phoneNumber.hashCode());
        Object $department = this.getDepartment();
        result = result * 59 + ($department == null ? 43 : $department.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        return "User(id=" + this.getId() +
                ", username=" + this.getUsername() +
                ", email=" + this.getEmail() +
                ", password=" + this.getPassword() +
                ", fullName=" + this.getFullName() +
                ", firstName=" + this.getFirstName() +
                ", middleName=" + this.getMiddleName() +
                ", lastName=" + this.getLastName() +
                ", registrationNumber=" + this.getRegistrationNumber() +
                ", role=" + this.getRole() +
                ", isActive=" + this.isActive() +
                ", lastLogin=" + this.getLastLogin() +
                ", createdAt=" + this.getCreatedAt() +
                ", updatedAt=" + this.getUpdatedAt() +
                ", phoneNumber=" + this.getPhoneNumber() +
                ", department=" + this.getDepartment() + ")";
    }
}