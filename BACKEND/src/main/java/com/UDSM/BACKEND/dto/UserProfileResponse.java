
package com.UDSM.BACKEND.dto;

import com.UDSM.BACKEND.Model.ClearanceStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.LocalDateTime;
import lombok.Generated;

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
    @JsonProperty("last_login")
    private LocalDateTime lastLogin;
    @JsonProperty("created_at")
    private LocalDateTime createdAt;
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;
    @JsonProperty("programme")
    private String programme;
    @JsonProperty("faculty")
    private String faculty;
    @JsonProperty("year_of_study")
    private String yearOfStudy;
    @JsonProperty("academic_year")
    private String academicYear;
    @JsonProperty("clearance_status")
    private ClearanceStatus clearanceStatus;
    @JsonProperty("is_final_year")
    private boolean isFinalYear;

    @Generated
    public static UserProfileResponseBuilder builder() {
        return new UserProfileResponseBuilder();
    }

    @Generated
    public String getId() {
        return this.id;
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
    public String getPhoneNumber() {
        return this.phoneNumber;
    }

    @Generated
    public String getDepartment() {
        return this.department;
    }

    @Generated
    public LocalDateTime getLastLogin() {
        return this.lastLogin;
    }

    @Generated
    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @Generated
    public LocalDateTime getUpdatedAt() {
        return this.updatedAt;
    }

    @Generated
    public String getProgramme() {
        return this.programme;
    }

    @Generated
    public String getFaculty() {
        return this.faculty;
    }

    @Generated
    public String getYearOfStudy() {
        return this.yearOfStudy;
    }

    @Generated
    public String getAcademicYear() {
        return this.academicYear;
    }

    @Generated
    public ClearanceStatus getClearanceStatus() {
        return this.clearanceStatus;
    }

    @Generated
    public boolean isFinalYear() {
        return this.isFinalYear;
    }

    @Generated
    public void setId(final String id) {
        this.id = id;
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
    public void setPhoneNumber(final String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    @Generated
    public void setDepartment(final String department) {
        this.department = department;
    }

    @Generated
    public void setLastLogin(final LocalDateTime lastLogin) {
        this.lastLogin = lastLogin;
    }

    @Generated
    public void setCreatedAt(final LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public void setUpdatedAt(final LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Generated
    public void setProgramme(final String programme) {
        this.programme = programme;
    }

    @Generated
    public void setFaculty(final String faculty) {
        this.faculty = faculty;
    }

    @Generated
    public void setYearOfStudy(final String yearOfStudy) {
        this.yearOfStudy = yearOfStudy;
    }

    @Generated
    public void setAcademicYear(final String academicYear) {
        this.academicYear = academicYear;
    }

    @Generated
    public void setClearanceStatus(final ClearanceStatus clearanceStatus) {
        this.clearanceStatus = clearanceStatus;
    }

    @Generated
    public void setFinalYear(final boolean isFinalYear) {
        this.isFinalYear = isFinalYear;
    }

    @Generated
    public boolean equals(final Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof UserProfileResponse)) {
            return false;
        } else {
            UserProfileResponse other = (UserProfileResponse)o;
            if (!other.canEqual(this)) {
                return false;
            } else if (this.isActive() != other.isActive()) {
                return false;
            } else if (this.isFinalYear() != other.isFinalYear()) {
                return false;
            } else {
                Object this$id = this.getId();
                Object other$id = other.getId();
                if (this$id == null) {
                    if (other$id != null) {
                        return false;
                    }
                } else if (!this$id.equals(other$id)) {
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

                Object this$phoneNumber = this.getPhoneNumber();
                Object other$phoneNumber = other.getPhoneNumber();
                if (this$phoneNumber == null) {
                    if (other$phoneNumber != null) {
                        return false;
                    }
                } else if (!this$phoneNumber.equals(other$phoneNumber)) {
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

                Object this$lastLogin = this.getLastLogin();
                Object other$lastLogin = other.getLastLogin();
                if (this$lastLogin == null) {
                    if (other$lastLogin != null) {
                        return false;
                    }
                } else if (!this$lastLogin.equals(other$lastLogin)) {
                    return false;
                }

                Object this$createdAt = this.getCreatedAt();
                Object other$createdAt = other.getCreatedAt();
                if (this$createdAt == null) {
                    if (other$createdAt != null) {
                        return false;
                    }
                } else if (!this$createdAt.equals(other$createdAt)) {
                    return false;
                }

                Object this$updatedAt = this.getUpdatedAt();
                Object other$updatedAt = other.getUpdatedAt();
                if (this$updatedAt == null) {
                    if (other$updatedAt != null) {
                        return false;
                    }
                } else if (!this$updatedAt.equals(other$updatedAt)) {
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

                Object this$faculty = this.getFaculty();
                Object other$faculty = other.getFaculty();
                if (this$faculty == null) {
                    if (other$faculty != null) {
                        return false;
                    }
                } else if (!this$faculty.equals(other$faculty)) {
                    return false;
                }

                Object this$yearOfStudy = this.getYearOfStudy();
                Object other$yearOfStudy = other.getYearOfStudy();
                if (this$yearOfStudy == null) {
                    if (other$yearOfStudy != null) {
                        return false;
                    }
                } else if (!this$yearOfStudy.equals(other$yearOfStudy)) {
                    return false;
                }

                Object this$academicYear = this.getAcademicYear();
                Object other$academicYear = other.getAcademicYear();
                if (this$academicYear == null) {
                    if (other$academicYear != null) {
                        return false;
                    }
                } else if (!this$academicYear.equals(other$academicYear)) {
                    return false;
                }

                Object this$clearanceStatus = this.getClearanceStatus();
                Object other$clearanceStatus = other.getClearanceStatus();
                if (this$clearanceStatus == null) {
                    if (other$clearanceStatus != null) {
                        return false;
                    }
                } else if (!this$clearanceStatus.equals(other$clearanceStatus)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(final Object other) {
        return other instanceof UserProfileResponse;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isActive() ? 79 : 97);
        result = result * 59 + (this.isFinalYear() ? 79 : 97);
        Object $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
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
        Object $phoneNumber = this.getPhoneNumber();
        result = result * 59 + ($phoneNumber == null ? 43 : $phoneNumber.hashCode());
        Object $department = this.getDepartment();
        result = result * 59 + ($department == null ? 43 : $department.hashCode());
        Object $lastLogin = this.getLastLogin();
        result = result * 59 + ($lastLogin == null ? 43 : $lastLogin.hashCode());
        Object $createdAt = this.getCreatedAt();
        result = result * 59 + ($createdAt == null ? 43 : $createdAt.hashCode());
        Object $updatedAt = this.getUpdatedAt();
        result = result * 59 + ($updatedAt == null ? 43 : $updatedAt.hashCode());
        Object $programme = this.getProgramme();
        result = result * 59 + ($programme == null ? 43 : $programme.hashCode());
        Object $faculty = this.getFaculty();
        result = result * 59 + ($faculty == null ? 43 : $faculty.hashCode());
        Object $yearOfStudy = this.getYearOfStudy();
        result = result * 59 + ($yearOfStudy == null ? 43 : $yearOfStudy.hashCode());
        Object $academicYear = this.getAcademicYear();
        result = result * 59 + ($academicYear == null ? 43 : $academicYear.hashCode());
        Object $clearanceStatus = this.getClearanceStatus();
        result = result * 59 + ($clearanceStatus == null ? 43 : $clearanceStatus.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getId();
        return "UserProfileResponse(id=" + var10000 + ", username=" + this.getUsername() + ", email=" + this.getEmail() + ", fullName=" + this.getFullName() + ", registrationNumber=" + this.getRegistrationNumber() + ", role=" + this.getRole() + ", isActive=" + this.isActive() + ", phoneNumber=" + this.getPhoneNumber() + ", department=" + this.getDepartment() + ", lastLogin=" + String.valueOf(this.getLastLogin()) + ", createdAt=" + String.valueOf(this.getCreatedAt()) + ", updatedAt=" + String.valueOf(this.getUpdatedAt()) + ", programme=" + this.getProgramme() + ", faculty=" + this.getFaculty() + ", yearOfStudy=" + this.getYearOfStudy() + ", academicYear=" + this.getAcademicYear() + ", clearanceStatus=" + String.valueOf(this.getClearanceStatus()) + ", isFinalYear=" + this.isFinalYear() + ")";
    }

    @Generated
    public UserProfileResponse() {
    }

    @Generated
    public UserProfileResponse(final String id, final String username, final String email, final String fullName, final String registrationNumber, final String role, final boolean isActive, final String phoneNumber, final String department, final LocalDateTime lastLogin, final LocalDateTime createdAt, final LocalDateTime updatedAt, final String programme, final String faculty, final String yearOfStudy, final String academicYear, final ClearanceStatus clearanceStatus, final boolean isFinalYear) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.registrationNumber = registrationNumber;
        this.role = role;
        this.isActive = isActive;
        this.phoneNumber = phoneNumber;
        this.department = department;
        this.lastLogin = lastLogin;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.programme = programme;
        this.faculty = faculty;
        this.yearOfStudy = yearOfStudy;
        this.academicYear = academicYear;
        this.clearanceStatus = clearanceStatus;
        this.isFinalYear = isFinalYear;
    }

    @Generated
    public static class UserProfileResponseBuilder {
        @Generated
        private String id;
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
        private String phoneNumber;
        @Generated
        private String department;
        @Generated
        private LocalDateTime lastLogin;
        @Generated
        private LocalDateTime createdAt;
        @Generated
        private LocalDateTime updatedAt;
        @Generated
        private String programme;
        @Generated
        private String faculty;
        @Generated
        private String yearOfStudy;
        @Generated
        private String academicYear;
        @Generated
        private ClearanceStatus clearanceStatus;
        @Generated
        private boolean isFinalYear;

        @Generated
        UserProfileResponseBuilder() {
        }

        @JsonProperty("id")
        @Generated
        public UserProfileResponseBuilder id(final String id) {
            this.id = id;
            return this;
        }

        @JsonProperty("username")
        @Generated
        public UserProfileResponseBuilder username(final String username) {
            this.username = username;
            return this;
        }

        @JsonProperty("email")
        @Generated
        public UserProfileResponseBuilder email(final String email) {
            this.email = email;
            return this;
        }

        @JsonProperty("full_name")
        @Generated
        public UserProfileResponseBuilder fullName(final String fullName) {
            this.fullName = fullName;
            return this;
        }

        @JsonProperty("registration_number")
        @Generated
        public UserProfileResponseBuilder registrationNumber(final String registrationNumber) {
            this.registrationNumber = registrationNumber;
            return this;
        }

        @JsonProperty("role")
        @Generated
        public UserProfileResponseBuilder role(final String role) {
            this.role = role;
            return this;
        }

        @JsonProperty("is_active")
        @Generated
        public UserProfileResponseBuilder isActive(final boolean isActive) {
            this.isActive = isActive;
            return this;
        }

        @JsonProperty("phone_number")
        @Generated
        public UserProfileResponseBuilder phoneNumber(final String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        @JsonProperty("department")
        @Generated
        public UserProfileResponseBuilder department(final String department) {
            this.department = department;
            return this;
        }

        @JsonProperty("last_login")
        @Generated
        public UserProfileResponseBuilder lastLogin(final LocalDateTime lastLogin) {
            this.lastLogin = lastLogin;
            return this;
        }

        @JsonProperty("created_at")
        @Generated
        public UserProfileResponseBuilder createdAt(final LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        @JsonProperty("updated_at")
        @Generated
        public UserProfileResponseBuilder updatedAt(final LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        @JsonProperty("programme")
        @Generated
        public UserProfileResponseBuilder programme(final String programme) {
            this.programme = programme;
            return this;
        }

        @JsonProperty("faculty")
        @Generated
        public UserProfileResponseBuilder faculty(final String faculty) {
            this.faculty = faculty;
            return this;
        }

        @JsonProperty("year_of_study")
        @Generated
        public UserProfileResponseBuilder yearOfStudy(final String yearOfStudy) {
            this.yearOfStudy = yearOfStudy;
            return this;
        }

        @JsonProperty("academic_year")
        @Generated
        public UserProfileResponseBuilder academicYear(final String academicYear) {
            this.academicYear = academicYear;
            return this;
        }

        @JsonProperty("clearance_status")
        @Generated
        public UserProfileResponseBuilder clearanceStatus(final ClearanceStatus clearanceStatus) {
            this.clearanceStatus = clearanceStatus;
            return this;
        }

        @JsonProperty("is_final_year")
        @Generated
        public UserProfileResponseBuilder isFinalYear(final boolean isFinalYear) {
            this.isFinalYear = isFinalYear;
            return this;
        }

        @Generated
        public UserProfileResponse build() {
            return new UserProfileResponse(this.id, this.username, this.email, this.fullName, this.registrationNumber, this.role, this.isActive, this.phoneNumber, this.department, this.lastLogin, this.createdAt, this.updatedAt, this.programme, this.faculty, this.yearOfStudy, this.academicYear, this.clearanceStatus, this.isFinalYear);
        }

        @Generated
        public String toString() {
            String var10000 = this.id;
            return "UserProfileResponse.UserProfileResponseBuilder(id=" + var10000 + ", username=" + this.username + ", email=" + this.email + ", fullName=" + this.fullName + ", registrationNumber=" + this.registrationNumber + ", role=" + this.role + ", isActive=" + this.isActive + ", phoneNumber=" + this.phoneNumber + ", department=" + this.department + ", lastLogin=" + String.valueOf(this.lastLogin) + ", createdAt=" + String.valueOf(this.createdAt) + ", updatedAt=" + String.valueOf(this.updatedAt) + ", programme=" + this.programme + ", faculty=" + this.faculty + ", yearOfStudy=" + this.yearOfStudy + ", academicYear=" + this.academicYear + ", clearanceStatus=" + String.valueOf(this.clearanceStatus) + ", isFinalYear=" + this.isFinalYear + ")";
        }
    }
}
