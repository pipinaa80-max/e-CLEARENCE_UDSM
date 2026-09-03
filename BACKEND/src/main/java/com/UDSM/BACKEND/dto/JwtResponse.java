

package com.UDSM.BACKEND.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Generated;

@JsonInclude(Include.NON_NULL)
public class JwtResponse {
    @JsonProperty("access_token")
    private String accessToken;
    @JsonProperty("refresh_token")
    private String refreshToken;
    @JsonProperty("token_type")
    private String tokenType;
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

    @Generated
    public static JwtResponseBuilder builder() {
        return new JwtResponseBuilder();
    }

    @Generated
    public String getAccessToken() {
        return this.accessToken;
    }

    @Generated
    public String getRefreshToken() {
        return this.refreshToken;
    }

    @Generated
    public String getTokenType() {
        return this.tokenType;
    }

    @Generated
    public long getExpiresIn() {
        return this.expiresIn;
    }

    @Generated
    public String getUserId() {
        return this.userId;
    }

    @Generated
    public String getUsername() {
        return this.username;
    }

    @Generated
    public String getEmail() {
        return this.email;
    }

    @Generated
    public String getFullName() {
        return this.fullName;
    }

    @Generated
    public String getRegistrationNumber() {
        return this.registrationNumber;
    }

    @Generated
    public String getRole() {
        return this.role;
    }

    @Generated
    public boolean isActive() {
        return this.isActive;
    }

    @Generated
    public LocalDateTime getLastLogin() {
        return this.lastLogin;
    }

    @Generated
    public List<String> getPermissions() {
        return this.permissions;
    }

    @Generated
    public String getDepartment() {
        return this.department;
    }

    @Generated
    public String getFaculty() {
        return this.faculty;
    }

    @Generated
    public String getProgramme() {
        return this.programme;
    }

    @Generated
    public void setAccessToken(final String accessToken) {
        this.accessToken = accessToken;
    }

    @Generated
    public void setRefreshToken(final String refreshToken) {
        this.refreshToken = refreshToken;
    }

    @Generated
    public void setTokenType(final String tokenType) {
        this.tokenType = tokenType;
    }

    @Generated
    public void setExpiresIn(final long expiresIn) {
        this.expiresIn = expiresIn;
    }

    @Generated
    public void setUserId(final String userId) {
        this.userId = userId;
    }

    @Generated
    public void setUsername(final String username) {
        this.username = username;
    }

    @Generated
    public void setEmail(final String email) {
        this.email = email;
    }

    @Generated
    public void setFullName(final String fullName) {
        this.fullName = fullName;
    }

    @Generated
    public void setRegistrationNumber(final String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    @Generated
    public void setRole(final String role) {
        this.role = role;
    }

    @Generated
    public void setActive(final boolean isActive) {
        this.isActive = isActive;
    }

    @Generated
    public void setLastLogin(final LocalDateTime lastLogin) {
        this.lastLogin = lastLogin;
    }

    @Generated
    public void setPermissions(final List<String> permissions) {
        this.permissions = permissions;
    }

    @Generated
    public void setDepartment(final String department) {
        this.department = department;
    }

    @Generated
    public void setFaculty(final String faculty) {
        this.faculty = faculty;
    }

    @Generated
    public void setProgramme(final String programme) {
        this.programme = programme;
    }

    @Generated
    public boolean equals(final Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof JwtResponse)) {
            return false;
        } else {
            JwtResponse other = (JwtResponse)o;
            if (!other.canEqual(this)) {
                return false;
            } else if (this.getExpiresIn() != other.getExpiresIn()) {
                return false;
            } else if (this.isActive() != other.isActive()) {
                return false;
            } else {
                Object this$accessToken = this.getAccessToken();
                Object other$accessToken = other.getAccessToken();
                if (this$accessToken == null) {
                    if (other$accessToken != null) {
                        return false;
                    }
                } else if (!this$accessToken.equals(other$accessToken)) {
                    return false;
                }

                Object this$refreshToken = this.getRefreshToken();
                Object other$refreshToken = other.getRefreshToken();
                if (this$refreshToken == null) {
                    if (other$refreshToken != null) {
                        return false;
                    }
                } else if (!this$refreshToken.equals(other$refreshToken)) {
                    return false;
                }

                Object this$tokenType = this.getTokenType();
                Object other$tokenType = other.getTokenType();
                if (this$tokenType == null) {
                    if (other$tokenType != null) {
                        return false;
                    }
                } else if (!this$tokenType.equals(other$tokenType)) {
                    return false;
                }

                Object this$userId = this.getUserId();
                Object other$userId = other.getUserId();
                if (this$userId == null) {
                    if (other$userId != null) {
                        return false;
                    }
                } else if (!this$userId.equals(other$userId)) {
                    return false;
                }

                Object this$username = this.getUsername();
                Object other$username = other.getUsername();
                if (this$username == null) {
                    if (other$username != null) {
                        return false;
                    }
                } else if (!this$username.equals(other$username)) {
                    return false;
                }

                Object this$email = this.getEmail();
                Object other$email = other.getEmail();
                if (this$email == null) {
                    if (other$email != null) {
                        return false;
                    }
                } else if (!this$email.equals(other$email)) {
                    return false;
                }

                Object this$fullName = this.getFullName();
                Object other$fullName = other.getFullName();
                if (this$fullName == null) {
                    if (other$fullName != null) {
                        return false;
                    }
                } else if (!this$fullName.equals(other$fullName)) {
                    return false;
                }

                Object this$registrationNumber = this.getRegistrationNumber();
                Object other$registrationNumber = other.getRegistrationNumber();
                if (this$registrationNumber == null) {
                    if (other$registrationNumber != null) {
                        return false;
                    }
                } else if (!this$registrationNumber.equals(other$registrationNumber)) {
                    return false;
                }

                Object this$role = this.getRole();
                Object other$role = other.getRole();
                if (this$role == null) {
                    if (other$role != null) {
                        return false;
                    }
                } else if (!this$role.equals(other$role)) {
                    return false;
                }

                Object this$lastLogin = this.getLastLogin();
                Object other$lastLogin = other.getLastLogin();
                if (this$lastLogin == null) {
                    if (other$lastLogin != null) {
                        return false;
                    }
                } else if (!this$lastLogin.equals(other$lastLogin)) {
                    return false;
                }

                Object this$permissions = this.getPermissions();
                Object other$permissions = other.getPermissions();
                if (this$permissions == null) {
                    if (other$permissions != null) {
                        return false;
                    }
                } else if (!this$permissions.equals(other$permissions)) {
                    return false;
                }

                Object this$department = this.getDepartment();
                Object other$department = other.getDepartment();
                if (this$department == null) {
                    if (other$department != null) {
                        return false;
                    }
                } else if (!this$department.equals(other$department)) {
                    return false;
                }

                Object this$faculty = this.getFaculty();
                Object other$faculty = other.getFaculty();
                if (this$faculty == null) {
                    if (other$faculty != null) {
                        return false;
                    }
                } else if (!this$faculty.equals(other$faculty)) {
                    return false;
                }

                Object this$programme = this.getProgramme();
                Object other$programme = other.getProgramme();
                if (this$programme == null) {
                    if (other$programme != null) {
                        return false;
                    }
                } else if (!this$programme.equals(other$programme)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(final Object other) {
        return other instanceof JwtResponse;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        long $expiresIn = this.getExpiresIn();
        result = result * 59 + (int)($expiresIn ^ $expiresIn >>> 32);
        result = result * 59 + (this.isActive() ? 79 : 97);
        Object $accessToken = this.getAccessToken();
        result = result * 59 + ($accessToken == null ? 43 : $accessToken.hashCode());
        Object $refreshToken = this.getRefreshToken();
        result = result * 59 + ($refreshToken == null ? 43 : $refreshToken.hashCode());
        Object $tokenType = this.getTokenType();
        result = result * 59 + ($tokenType == null ? 43 : $tokenType.hashCode());
        Object $userId = this.getUserId();
        result = result * 59 + ($userId == null ? 43 : $userId.hashCode());
        Object $username = this.getUsername();
        result = result * 59 + ($username == null ? 43 : $username.hashCode());
        Object $email = this.getEmail();
        result = result * 59 + ($email == null ? 43 : $email.hashCode());
        Object $fullName = this.getFullName();
        result = result * 59 + ($fullName == null ? 43 : $fullName.hashCode());
        Object $registrationNumber = this.getRegistrationNumber();
        result = result * 59 + ($registrationNumber == null ? 43 : $registrationNumber.hashCode());
        Object $role = this.getRole();
        result = result * 59 + ($role == null ? 43 : $role.hashCode());
        Object $lastLogin = this.getLastLogin();
        result = result * 59 + ($lastLogin == null ? 43 : $lastLogin.hashCode());
        Object $permissions = this.getPermissions();
        result = result * 59 + ($permissions == null ? 43 : $permissions.hashCode());
        Object $department = this.getDepartment();
        result = result * 59 + ($department == null ? 43 : $department.hashCode());
        Object $faculty = this.getFaculty();
        result = result * 59 + ($faculty == null ? 43 : $faculty.hashCode());
        Object $programme = this.getProgramme();
        result = result * 59 + ($programme == null ? 43 : $programme.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getAccessToken();
        return "JwtResponse(accessToken=" + var10000 + ", refreshToken=" + this.getRefreshToken() + ", tokenType=" + this.getTokenType() + ", expiresIn=" + this.getExpiresIn() + ", userId=" + this.getUserId() + ", username=" + this.getUsername() + ", email=" + this.getEmail() + ", fullName=" + this.getFullName() + ", registrationNumber=" + this.getRegistrationNumber() + ", role=" + this.getRole() + ", isActive=" + this.isActive() + ", lastLogin=" + String.valueOf(this.getLastLogin()) + ", permissions=" + String.valueOf(this.getPermissions()) + ", department=" + this.getDepartment() + ", faculty=" + this.getFaculty() + ", programme=" + this.getProgramme() + ")";
    }

    @Generated
    public JwtResponse() {
    }

    @Generated
    public JwtResponse(final String accessToken, final String refreshToken, final String tokenType, final long expiresIn, final String userId, final String username, final String email, final String fullName, final String registrationNumber, final String role, final boolean isActive, final LocalDateTime lastLogin, final List<String> permissions, final String department, final String faculty, final String programme) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = tokenType;
        this.expiresIn = expiresIn;
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.registrationNumber = registrationNumber;
        this.role = role;
        this.isActive = isActive;
        this.lastLogin = lastLogin;
        this.permissions = permissions;
        this.department = department;
        this.faculty = faculty;
        this.programme = programme;
    }

    @Generated
    public static class JwtResponseBuilder {
        @Generated
        private String accessToken;
        @Generated
        private String refreshToken;
        @Generated
        private String tokenType;
        @Generated
        private long expiresIn;
        @Generated
        private String userId;
        @Generated
        private String username;
        @Generated
        private String email;
        @Generated
        private String fullName;
        @Generated
        private String registrationNumber;
        @Generated
        private String role;
        @Generated
        private boolean isActive;
        @Generated
        private LocalDateTime lastLogin;
        @Generated
        private List<String> permissions;
        @Generated
        private String department;
        @Generated
        private String faculty;
        @Generated
        private String programme;

        @Generated
        JwtResponseBuilder() {
        }

        @JsonProperty("access_token")
        @Generated
        public JwtResponseBuilder accessToken(final String accessToken) {
            this.accessToken = accessToken;
            return this;
        }

        @JsonProperty("refresh_token")
        @Generated
        public JwtResponseBuilder refreshToken(final String refreshToken) {
            this.refreshToken = refreshToken;
            return this;
        }

        @JsonProperty("token_type")
        @Generated
        public JwtResponseBuilder tokenType(final String tokenType) {
            this.tokenType = tokenType;
            return this;
        }

        @JsonProperty("expires_in")
        @Generated
        public JwtResponseBuilder expiresIn(final long expiresIn) {
            this.expiresIn = expiresIn;
            return this;
        }

        @JsonProperty("user_id")
        @Generated
        public JwtResponseBuilder userId(final String userId) {
            this.userId = userId;
            return this;
        }

        @JsonProperty("username")
        @Generated
        public JwtResponseBuilder username(final String username) {
            this.username = username;
            return this;
        }

        @JsonProperty("email")
        @Generated
        public JwtResponseBuilder email(final String email) {
            this.email = email;
            return this;
        }

        @JsonProperty("full_name")
        @Generated
        public JwtResponseBuilder fullName(final String fullName) {
            this.fullName = fullName;
            return this;
        }

        @JsonProperty("registration_number")
        @Generated
        public JwtResponseBuilder registrationNumber(final String registrationNumber) {
            this.registrationNumber = registrationNumber;
            return this;
        }

        @JsonProperty("role")
        @Generated
        public JwtResponseBuilder role(final String role) {
            this.role = role;
            return this;
        }

        @JsonProperty("is_active")
        @Generated
        public JwtResponseBuilder isActive(final boolean isActive) {
            this.isActive = isActive;
            return this;
        }

        @JsonProperty("last_login")
        @Generated
        public JwtResponseBuilder lastLogin(final LocalDateTime lastLogin) {
            this.lastLogin = lastLogin;
            return this;
        }

        @JsonProperty("permissions")
        @Generated
        public JwtResponseBuilder permissions(final List<String> permissions) {
            this.permissions = permissions;
            return this;
        }

        @JsonProperty("department")
        @Generated
        public JwtResponseBuilder department(final String department) {
            this.department = department;
            return this;
        }

        @JsonProperty("faculty")
        @Generated
        public JwtResponseBuilder faculty(final String faculty) {
            this.faculty = faculty;
            return this;
        }

        @JsonProperty("programme")
        @Generated
        public JwtResponseBuilder programme(final String programme) {
            this.programme = programme;
            return this;
        }

        @Generated
        public JwtResponse build() {
            return new JwtResponse(this.accessToken, this.refreshToken, this.tokenType, this.expiresIn, this.userId, this.username, this.email, this.fullName, this.registrationNumber, this.role, this.isActive, this.lastLogin, this.permissions, this.department, this.faculty, this.programme);
        }

        @Generated
        public String toString() {
            String var10000 = this.accessToken;
            return "JwtResponse.JwtResponseBuilder(accessToken=" + var10000 + ", refreshToken=" + this.refreshToken + ", tokenType=" + this.tokenType + ", expiresIn=" + this.expiresIn + ", userId=" + this.userId + ", username=" + this.username + ", email=" + this.email + ", fullName=" + this.fullName + ", registrationNumber=" + this.registrationNumber + ", role=" + this.role + ", isActive=" + this.isActive + ", lastLogin=" + String.valueOf(this.lastLogin) + ", permissions=" + String.valueOf(this.permissions) + ", department=" + this.department + ", faculty=" + this.faculty + ", programme=" + this.programme + ")";
        }
    }
}
