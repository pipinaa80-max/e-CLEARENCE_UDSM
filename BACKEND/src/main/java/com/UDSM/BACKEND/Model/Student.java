

package com.UDSM.BACKEND.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Generated;
import lombok.Getter;
import lombok.Setter;

@Entity
@Setter
@Getter
@Table(name = "students")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "registration_number", unique = true, nullable = false)
    private String registrationNumber;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "programme")
    private String programme;

    @Column(name = "faculty")
    private String faculty;

    @Column(name = "department")
    private String department;

    @Column(name = "year_of_study")
    private String yearOfStudy;

    @Column(name = "academic_year")
    private String academicYear;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;


    @Column(name = "nationality")
    private String nationality;

    @Column(name = "address")
    private String address;

    @Column(name = "profile_image_url")
    private String profileImageUrl;


    @Column(name = "is_final_year")
    private boolean isFinalYear = false;

    @Column(name = "clearance_status")
    @Enumerated(EnumType.STRING)
    private ClearanceStatus clearanceStatus;

    @Column(name = "created_at")
    private LocalDateTime createdAt;


    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @Generated
    public static StudentBuilder builder() {
        return new StudentBuilder();
    }

    @Generated
    public String getId() {
        return this.id;
    }

    @Generated
    public String getRegistrationNumber() {
        return this.registrationNumber;
    }

    @Generated
    public String getFullName() {
        return this.fullName;
    }

    @Generated
    public String getEmail() {
        return this.email;
    }

    @Generated
    public String getPhoneNumber() {
        return this.phoneNumber;
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
    public String getDepartment() {
        return this.department;
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
    public LocalDate getDateOfBirth() {
        return this.dateOfBirth;
    }

    @Generated
    public String getNationality() {
        return this.nationality;
    }

    @Generated
    public String getAddress() {
        return this.address;
    }

    @Generated
    public String getProfileImageUrl() {
        return this.profileImageUrl;
    }

    @Generated
    public boolean isFinalYear() {
        return this.isFinalYear;
    }

    @Generated
    public ClearanceStatus getClearanceStatus() {
        return this.clearanceStatus;
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
    public User getUser() {
        return this.user;
    }

    @Generated
    public void setId(String id) {
        this.id = id;
    }

    @Generated
    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    @Generated
    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    @Generated
    public void setEmail(String email) {
        this.email = email;
    }

    @Generated
    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    @Generated
    public void setProgramme(String programme) {
        this.programme = programme;
    }

    @Generated
    public void setFaculty(String faculty) {
        this.faculty = faculty;
    }

    @Generated
    public void setDepartment(String department) {
        this.department = department;
    }

    @Generated
    public void setYearOfStudy(String yearOfStudy) {
        this.yearOfStudy = yearOfStudy;
    }

    @Generated
    public void setAcademicYear(String academicYear) {
        this.academicYear = academicYear;
    }

    @Generated
    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    @Generated
    public void setNationality(String nationality) {
        this.nationality = nationality;
    }

    @Generated
    public void setAddress(String address) {
        this.address = address;
    }

    @Generated
    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    @Generated
    public void setFinalYear(boolean isFinalYear) {
        this.isFinalYear = isFinalYear;
    }

    @Generated
    public void setClearanceStatus(ClearanceStatus clearanceStatus) {
        this.clearanceStatus = clearanceStatus;
    }

    @Generated
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Generated
    public void setUser(User user) {
        this.user = user;
    }

    @Generated
    public boolean equals(Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof Student)) {
            return false;
        } else {
            Student other = (Student)o;
            if (!other.canEqual(this)) {
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

                Object this$registrationNumber = this.getRegistrationNumber();
                Object other$registrationNumber = other.getRegistrationNumber();
                if (this$registrationNumber == null) {
                    if (other$registrationNumber != null) {
                        return false;
                    }
                } else if (!this$registrationNumber.equals(other$registrationNumber)) {
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

                Object this$email = this.getEmail();
                Object other$email = other.getEmail();
                if (this$email == null) {
                    if (other$email != null) {
                        return false;
                    }
                } else if (!this$email.equals(other$email)) {
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

                Object this$department = this.getDepartment();
                Object other$department = other.getDepartment();
                if (this$department == null) {
                    if (other$department != null) {
                        return false;
                    }
                } else if (!this$department.equals(other$department)) {
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

                Object this$dateOfBirth = this.getDateOfBirth();
                Object other$dateOfBirth = other.getDateOfBirth();
                if (this$dateOfBirth == null) {
                    if (other$dateOfBirth != null) {
                        return false;
                    }
                } else if (!this$dateOfBirth.equals(other$dateOfBirth)) {
                    return false;
                }

                Object this$nationality = this.getNationality();
                Object other$nationality = other.getNationality();
                if (this$nationality == null) {
                    if (other$nationality != null) {
                        return false;
                    }
                } else if (!this$nationality.equals(other$nationality)) {
                    return false;
                }

                Object this$address = this.getAddress();
                Object other$address = other.getAddress();
                if (this$address == null) {
                    if (other$address != null) {
                        return false;
                    }
                } else if (!this$address.equals(other$address)) {
                    return false;
                }

                Object this$profileImageUrl = this.getProfileImageUrl();
                Object other$profileImageUrl = other.getProfileImageUrl();
                if (this$profileImageUrl == null) {
                    if (other$profileImageUrl != null) {
                        return false;
                    }
                } else if (!this$profileImageUrl.equals(other$profileImageUrl)) {
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

                Object this$user = this.getUser();
                Object other$user = other.getUser();
                if (this$user == null) {
                    if (other$user != null) {
                        return false;
                    }
                } else if (!this$user.equals(other$user)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(Object other) {
        return other instanceof Student;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isFinalYear() ? 79 : 97);
        Object $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $registrationNumber = this.getRegistrationNumber();
        result = result * 59 + ($registrationNumber == null ? 43 : $registrationNumber.hashCode());
        Object $fullName = this.getFullName();
        result = result * 59 + ($fullName == null ? 43 : $fullName.hashCode());
        Object $email = this.getEmail();
        result = result * 59 + ($email == null ? 43 : $email.hashCode());
        Object $phoneNumber = this.getPhoneNumber();
        result = result * 59 + ($phoneNumber == null ? 43 : $phoneNumber.hashCode());
        Object $programme = this.getProgramme();
        result = result * 59 + ($programme == null ? 43 : $programme.hashCode());
        Object $faculty = this.getFaculty();
        result = result * 59 + ($faculty == null ? 43 : $faculty.hashCode());
        Object $department = this.getDepartment();
        result = result * 59 + ($department == null ? 43 : $department.hashCode());
        Object $yearOfStudy = this.getYearOfStudy();
        result = result * 59 + ($yearOfStudy == null ? 43 : $yearOfStudy.hashCode());
        Object $academicYear = this.getAcademicYear();
        result = result * 59 + ($academicYear == null ? 43 : $academicYear.hashCode());
        Object $dateOfBirth = this.getDateOfBirth();
        result = result * 59 + ($dateOfBirth == null ? 43 : $dateOfBirth.hashCode());
        Object $nationality = this.getNationality();
        result = result * 59 + ($nationality == null ? 43 : $nationality.hashCode());
        Object $address = this.getAddress();
        result = result * 59 + ($address == null ? 43 : $address.hashCode());
        Object $profileImageUrl = this.getProfileImageUrl();
        result = result * 59 + ($profileImageUrl == null ? 43 : $profileImageUrl.hashCode());
        Object $clearanceStatus = this.getClearanceStatus();
        result = result * 59 + ($clearanceStatus == null ? 43 : $clearanceStatus.hashCode());
        Object $createdAt = this.getCreatedAt();
        result = result * 59 + ($createdAt == null ? 43 : $createdAt.hashCode());
        Object $updatedAt = this.getUpdatedAt();
        result = result * 59 + ($updatedAt == null ? 43 : $updatedAt.hashCode());
        Object $user = this.getUser();
        result = result * 59 + ($user == null ? 43 : $user.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getId();
        return "Student(id=" + var10000 + ", registrationNumber=" + this.getRegistrationNumber() + ", fullName=" + this.getFullName() + ", email=" + this.getEmail() + ", phoneNumber=" + this.getPhoneNumber() + ", programme=" + this.getProgramme() + ", faculty=" + this.getFaculty() + ", department=" + this.getDepartment() + ", yearOfStudy=" + this.getYearOfStudy() + ", academicYear=" + this.getAcademicYear() + ", dateOfBirth=" + String.valueOf(this.getDateOfBirth()) + ", nationality=" + this.getNationality() + ", address=" + this.getAddress() + ", profileImageUrl=" + this.getProfileImageUrl() + ", isFinalYear=" + this.isFinalYear() + ", clearanceStatus=" + String.valueOf(this.getClearanceStatus()) + ", createdAt=" + String.valueOf(this.getCreatedAt()) + ", updatedAt=" + String.valueOf(this.getUpdatedAt()) + ", user=" + String.valueOf(this.getUser()) + ")";
    }

    @Generated
    public Student() {
        this.clearanceStatus = ClearanceStatus.PENDING;
    }

    @Generated
    public Student(String id, String registrationNumber, String fullName, String email, String phoneNumber, String programme, String faculty, String department, String yearOfStudy, String academicYear, LocalDate dateOfBirth, String nationality, String address, String profileImageUrl, boolean isFinalYear, ClearanceStatus clearanceStatus, LocalDateTime createdAt, LocalDateTime updatedAt, User user) {
        this.clearanceStatus = ClearanceStatus.PENDING;
        this.id = id;
        this.registrationNumber = registrationNumber;
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.programme = programme;
        this.faculty = faculty;
        this.department = department;
        this.yearOfStudy = yearOfStudy;
        this.academicYear = academicYear;
        this.dateOfBirth = dateOfBirth;
        this.nationality = nationality;
        this.address = address;
        this.profileImageUrl = profileImageUrl;
        this.isFinalYear = isFinalYear;
        this.clearanceStatus = clearanceStatus;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.user = user;
    }

    public void setIsFinalYear(boolean b) {
        this.setFinalYear(true);
    }

    @Generated
    public static class StudentBuilder {
        @Generated
        private String id;
        @Generated
        private String registrationNumber;
        @Generated
        private String fullName;
        @Generated
        private String email;
        @Generated
        private String phoneNumber;
        @Generated
        private String programme;
        @Generated
        private String faculty;
        @Generated
        private String department;
        @Generated
        private String yearOfStudy;
        @Generated
        private String academicYear;
        @Generated
        private LocalDate dateOfBirth;
        @Generated
        private String nationality;
        @Generated
        private String address;
        @Generated
        private String profileImageUrl;
        @Generated
        private boolean isFinalYear;
        @Generated
        private ClearanceStatus clearanceStatus;
        @Generated
        private LocalDateTime createdAt;
        @Generated
        private LocalDateTime updatedAt;
        @Generated
        private User user;

        @Generated
        StudentBuilder() {
        }

        @Generated
        public StudentBuilder id(String id) {
            this.id = id;
            return this;
        }

        @Generated
        public StudentBuilder registrationNumber(String registrationNumber) {
            this.registrationNumber = registrationNumber;
            return this;
        }

        @Generated
        public StudentBuilder fullName(String fullName) {
            this.fullName = fullName;
            return this;
        }

        @Generated
        public StudentBuilder email(String email) {
            this.email = email;
            return this;
        }

        @Generated
        public StudentBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        @Generated
        public StudentBuilder programme(String programme) {
            this.programme = programme;
            return this;
        }

        @Generated
        public StudentBuilder faculty(String faculty) {
            this.faculty = faculty;
            return this;
        }

        @Generated
        public StudentBuilder department(String department) {
            this.department = department;
            return this;
        }

        @Generated
        public StudentBuilder yearOfStudy(String yearOfStudy) {
            this.yearOfStudy = yearOfStudy;
            return this;
        }

        @Generated
        public StudentBuilder academicYear(String academicYear) {
            this.academicYear = academicYear;
            return this;
        }

        @Generated
        public StudentBuilder dateOfBirth(LocalDate dateOfBirth) {
            this.dateOfBirth = dateOfBirth;
            return this;
        }

        @Generated
        public StudentBuilder nationality(String nationality) {
            this.nationality = nationality;
            return this;
        }

        @Generated
        public StudentBuilder address(String address) {
            this.address = address;
            return this;
        }

        @Generated
        public StudentBuilder profileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
            return this;
        }

        @Generated
        public StudentBuilder isFinalYear(boolean isFinalYear) {
            this.isFinalYear = isFinalYear;
            return this;
        }

        @Generated
        public StudentBuilder clearanceStatus(ClearanceStatus clearanceStatus) {
            this.clearanceStatus = clearanceStatus;
            return this;
        }

        @Generated
        public StudentBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        @Generated
        public StudentBuilder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        @Generated
        public StudentBuilder user(User user) {
            this.user = user;
            return this;
        }

        @Generated
        public Student build() {
            return new Student(this.id, this.registrationNumber, this.fullName, this.email, this.phoneNumber, this.programme, this.faculty, this.department, this.yearOfStudy, this.academicYear, this.dateOfBirth, this.nationality, this.address, this.profileImageUrl, this.isFinalYear, this.clearanceStatus, this.createdAt, this.updatedAt, this.user);
        }

        @Generated
        public String toString() {
            String var10000 = this.id;
            return "Student.StudentBuilder(id=" + var10000 + ", registrationNumber=" + this.registrationNumber + ", fullName=" + this.fullName + ", email=" + this.email + ", phoneNumber=" + this.phoneNumber + ", programme=" + this.programme + ", faculty=" + this.faculty + ", department=" + this.department + ", yearOfStudy=" + this.yearOfStudy + ", academicYear=" + this.academicYear + ", dateOfBirth=" + String.valueOf(this.dateOfBirth) + ", nationality=" + this.nationality + ", address=" + this.address + ", profileImageUrl=" + this.profileImageUrl + ", isFinalYear=" + this.isFinalYear + ", clearanceStatus=" + String.valueOf(this.clearanceStatus) + ", createdAt=" + String.valueOf(this.createdAt) + ", updatedAt=" + String.valueOf(this.updatedAt) + ", user=" + String.valueOf(this.user) + ")";
        }
    }
}
