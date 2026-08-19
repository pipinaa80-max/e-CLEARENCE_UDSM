
package com.UDSM.BACKEND.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Generated;

public class ClearanceRequestDTO {
    private @NotBlank(
            message = "Registration number is required"
    ) @Size(
            min = 5,
            max = 50,
            message = "Registration number must be between 5 and 50 characters"
    ) String registrationNumber;
    private @NotBlank(
            message = "Student name is required"
    ) @Size(
            min = 2,
            max = 100,
            message = "Student name must be between 2 and 100 characters"
    ) String studentName;
    private @Size(
            max = 100,
            message = "Email must not exceed 100 characters"
    ) String email;
    private @Size(max = 20, message = "Phone number must not exceed 20 characters")
    String phoneNumber;

    private @NotBlank(message = "Programme is required")
    String programme;

    private @NotBlank(message = "Faculty is required")
    String faculty;

    private @NotBlank(message = "Department is required"
    )
    String department;
    private @NotBlank(
            message = "Year of study is required"
    ) String yearOfStudy;
    private @NotBlank(
            message = "Academic year is required"
    ) String academicYear;
    private @NotBlank(
            message = "Semester is required"
    ) String semester;
    private @NotBlank(
            message = "Clearance reason is required"
    ) @Size(
            min = 10,
            max = 500,
            message = "Reason must be between 10 and 500 characters"
    ) String reason;
    private @Size(
            max = 500,
            message = "Comments must not exceed 500 characters"
    ) String comments;
    private @NotNull(
            message = "Clearance type is required"
    ) ClearanceType clearanceType;
    private List<String> selectedDepartments;
    private boolean allDepartments;
    private List<DocumentDTO> documents;
    private boolean hasSupportingDocuments;
    private AdditionalInfo additionalInfo;

    public boolean isValid() {
        return this.registrationNumber != null && !this.registrationNumber.isEmpty() && this.studentName != null && !this.studentName.isEmpty() && this.reason != null && !this.reason.isEmpty() && this.clearanceType != null;
    }

    public List<String> getDepartmentsToInclude() {
        if (this.allDepartments) {
            return this.getAllDefaultDepartments();
        } else {
            return this.selectedDepartments != null ? this.selectedDepartments : List.of();
        }
    }

    private List<String> getAllDefaultDepartments() {
        return List.of("Finance", "Library", "Academic Affairs", "ICT Division", this.department);
    }

    @Generated
    private static boolean $default$allDepartments() {
        return false;
    }

    @Generated
    private static boolean $default$hasSupportingDocuments() {
        return false;
    }

    @Generated
    public static ClearanceRequestDTOBuilder builder() {
        return new ClearanceRequestDTOBuilder();
    }

    @Generated
    public String getRegistrationNumber() {
        return this.registrationNumber;
    }

    @Generated
    public String getStudentName() {
        return this.studentName;
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
    public String getSemester() {
        return this.semester;
    }

    @Generated
    public String getReason() {
        return this.reason;
    }

    @Generated
    public String getComments() {
        return this.comments;
    }

    @Generated
    public ClearanceType getClearanceType() {
        return this.clearanceType;
    }

    @Generated
    public List<String> getSelectedDepartments() {
        return this.selectedDepartments;
    }

    @Generated
    public boolean isAllDepartments() {
        return this.allDepartments;
    }

    @Generated
    public List<DocumentDTO> getDocuments() {
        return this.documents;
    }

    @Generated
    public boolean isHasSupportingDocuments() {
        return this.hasSupportingDocuments;
    }

    @Generated
    public AdditionalInfo getAdditionalInfo() {
        return this.additionalInfo;
    }

    @Generated
    public void setRegistrationNumber(final String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    @Generated
    public void setStudentName(final String studentName) {
        this.studentName = studentName;
    }

    @Generated
    public void setEmail(final String email) {
        this.email = email;
    }

    @Generated
    public void setPhoneNumber(final String phoneNumber) {
        this.phoneNumber = phoneNumber;
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
    public void setDepartment(final String department) {
        this.department = department;
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
    public void setSemester(final String semester) {
        this.semester = semester;
    }

    @Generated
    public void setReason(final String reason) {
        this.reason = reason;
    }

    @Generated
    public void setComments(final String comments) {
        this.comments = comments;
    }

    @Generated
    public void setClearanceType(final ClearanceType clearanceType) {
        this.clearanceType = clearanceType;
    }

    @Generated
    public void setSelectedDepartments(final List<String> selectedDepartments) {
        this.selectedDepartments = selectedDepartments;
    }

    @Generated
    public void setAllDepartments(final boolean allDepartments) {
        this.allDepartments = allDepartments;
    }

    @Generated
    public void setDocuments(final List<DocumentDTO> documents) {
        this.documents = documents;
    }

    @Generated
    public void setHasSupportingDocuments(final boolean hasSupportingDocuments) {
        this.hasSupportingDocuments = hasSupportingDocuments;
    }

    @Generated
    public void setAdditionalInfo(final AdditionalInfo additionalInfo) {
        this.additionalInfo = additionalInfo;
    }

    @Generated
    public boolean equals(final Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof ClearanceRequestDTO)) {
            return false;
        } else {
            ClearanceRequestDTO other = (ClearanceRequestDTO)o;
            if (!other.canEqual(this)) {
                return false;
            } else if (this.isAllDepartments() != other.isAllDepartments()) {
                return false;
            } else if (this.isHasSupportingDocuments() != other.isHasSupportingDocuments()) {
                return false;
            } else {
                Object this$registrationNumber = this.getRegistrationNumber();
                Object other$registrationNumber = other.getRegistrationNumber();
                if (this$registrationNumber == null) {
                    if (other$registrationNumber != null) {
                        return false;
                    }
                } else if (!this$registrationNumber.equals(other$registrationNumber)) {
                    return false;
                }

                Object this$studentName = this.getStudentName();
                Object other$studentName = other.getStudentName();
                if (this$studentName == null) {
                    if (other$studentName != null) {
                        return false;
                    }
                } else if (!this$studentName.equals(other$studentName)) {
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

                Object this$semester = this.getSemester();
                Object other$semester = other.getSemester();
                if (this$semester == null) {
                    if (other$semester != null) {
                        return false;
                    }
                } else if (!this$semester.equals(other$semester)) {
                    return false;
                }

                Object this$reason = this.getReason();
                Object other$reason = other.getReason();
                if (this$reason == null) {
                    if (other$reason != null) {
                        return false;
                    }
                } else if (!this$reason.equals(other$reason)) {
                    return false;
                }

                Object this$comments = this.getComments();
                Object other$comments = other.getComments();
                if (this$comments == null) {
                    if (other$comments != null) {
                        return false;
                    }
                } else if (!this$comments.equals(other$comments)) {
                    return false;
                }

                Object this$clearanceType = this.getClearanceType();
                Object other$clearanceType = other.getClearanceType();
                if (this$clearanceType == null) {
                    if (other$clearanceType != null) {
                        return false;
                    }
                } else if (!this$clearanceType.equals(other$clearanceType)) {
                    return false;
                }

                Object this$selectedDepartments = this.getSelectedDepartments();
                Object other$selectedDepartments = other.getSelectedDepartments();
                if (this$selectedDepartments == null) {
                    if (other$selectedDepartments != null) {
                        return false;
                    }
                } else if (!this$selectedDepartments.equals(other$selectedDepartments)) {
                    return false;
                }

                Object this$documents = this.getDocuments();
                Object other$documents = other.getDocuments();
                if (this$documents == null) {
                    if (other$documents != null) {
                        return false;
                    }
                } else if (!this$documents.equals(other$documents)) {
                    return false;
                }

                Object this$additionalInfo = this.getAdditionalInfo();
                Object other$additionalInfo = other.getAdditionalInfo();
                if (this$additionalInfo == null) {
                    if (other$additionalInfo != null) {
                        return false;
                    }
                } else if (!this$additionalInfo.equals(other$additionalInfo)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(final Object other) {
        return other instanceof ClearanceRequestDTO;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isAllDepartments() ? 79 : 97);
        result = result * 59 + (this.isHasSupportingDocuments() ? 79 : 97);
        Object $registrationNumber = this.getRegistrationNumber();
        result = result * 59 + ($registrationNumber == null ? 43 : $registrationNumber.hashCode());
        Object $studentName = this.getStudentName();
        result = result * 59 + ($studentName == null ? 43 : $studentName.hashCode());
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
        Object $semester = this.getSemester();
        result = result * 59 + ($semester == null ? 43 : $semester.hashCode());
        Object $reason = this.getReason();
        result = result * 59 + ($reason == null ? 43 : $reason.hashCode());
        Object $comments = this.getComments();
        result = result * 59 + ($comments == null ? 43 : $comments.hashCode());
        Object $clearanceType = this.getClearanceType();
        result = result * 59 + ($clearanceType == null ? 43 : $clearanceType.hashCode());
        Object $selectedDepartments = this.getSelectedDepartments();
        result = result * 59 + ($selectedDepartments == null ? 43 : $selectedDepartments.hashCode());
        Object $documents = this.getDocuments();
        result = result * 59 + ($documents == null ? 43 : $documents.hashCode());
        Object $additionalInfo = this.getAdditionalInfo();
        result = result * 59 + ($additionalInfo == null ? 43 : $additionalInfo.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getRegistrationNumber();
        return "ClearanceRequestDTO(registrationNumber=" + var10000 + ", studentName=" + this.getStudentName() + ", email=" + this.getEmail() + ", phoneNumber=" + this.getPhoneNumber() + ", programme=" + this.getProgramme() + ", faculty=" + this.getFaculty() + ", department=" + this.getDepartment() + ", yearOfStudy=" + this.getYearOfStudy() + ", academicYear=" + this.getAcademicYear() + ", semester=" + this.getSemester() + ", reason=" + this.getReason() + ", comments=" + this.getComments() + ", clearanceType=" + String.valueOf(this.getClearanceType()) + ", selectedDepartments=" + String.valueOf(this.getSelectedDepartments()) + ", allDepartments=" + this.isAllDepartments() + ", documents=" + String.valueOf(this.getDocuments()) + ", hasSupportingDocuments=" + this.isHasSupportingDocuments() + ", additionalInfo=" + String.valueOf(this.getAdditionalInfo()) + ")";
    }

    @Generated
    public ClearanceRequestDTO() {
        this.allDepartments = $default$allDepartments();
        this.hasSupportingDocuments = $default$hasSupportingDocuments();
    }

    @Generated
    public ClearanceRequestDTO(final String registrationNumber, final String studentName, final String email, final String phoneNumber, final String programme, final String faculty, final String department, final String yearOfStudy, final String academicYear, final String semester, final String reason, final String comments, final ClearanceType clearanceType, final List<String> selectedDepartments, final boolean allDepartments, final List<DocumentDTO> documents, final boolean hasSupportingDocuments, final AdditionalInfo additionalInfo) {
        this.registrationNumber = registrationNumber;
        this.studentName = studentName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.programme = programme;
        this.faculty = faculty;
        this.department = department;
        this.yearOfStudy = yearOfStudy;
        this.academicYear = academicYear;
        this.semester = semester;
        this.reason = reason;
        this.comments = comments;
        this.clearanceType = clearanceType;
        this.selectedDepartments = selectedDepartments;
        this.allDepartments = allDepartments;
        this.documents = documents;
        this.hasSupportingDocuments = hasSupportingDocuments;
        this.additionalInfo = additionalInfo;
    }

    @Generated
    public static class ClearanceRequestDTOBuilder {
        @Generated
        private String registrationNumber;
        @Generated
        private String studentName;
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
        private String semester;
        @Generated
        private String reason;
        @Generated
        private String comments;
        @Generated
        private ClearanceType clearanceType;
        @Generated
        private List<String> selectedDepartments;
        @Generated
        private boolean allDepartments$value;
        @Generated
        private boolean allDepartments$set;
        @Generated
        private List<DocumentDTO> documents;
        @Generated
        private boolean hasSupportingDocuments$value;
        @Generated
        private boolean hasSupportingDocuments$set;
        @Generated
        private AdditionalInfo additionalInfo;

        @Generated
        ClearanceRequestDTOBuilder() {
        }

        @Generated
        public ClearanceRequestDTOBuilder registrationNumber(final String registrationNumber) {
            this.registrationNumber = registrationNumber;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder studentName(final String studentName) {
            this.studentName = studentName;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder email(final String email) {
            this.email = email;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder phoneNumber(final String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder programme(final String programme) {
            this.programme = programme;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder faculty(final String faculty) {
            this.faculty = faculty;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder department(final String department) {
            this.department = department;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder yearOfStudy(final String yearOfStudy) {
            this.yearOfStudy = yearOfStudy;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder academicYear(final String academicYear) {
            this.academicYear = academicYear;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder semester(final String semester) {
            this.semester = semester;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder reason(final String reason) {
            this.reason = reason;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder comments(final String comments) {
            this.comments = comments;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder clearanceType(final ClearanceType clearanceType) {
            this.clearanceType = clearanceType;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder selectedDepartments(final List<String> selectedDepartments) {
            this.selectedDepartments = selectedDepartments;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder allDepartments(final boolean allDepartments) {
            this.allDepartments$value = allDepartments;
            this.allDepartments$set = true;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder documents(final List<DocumentDTO> documents) {
            this.documents = documents;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder hasSupportingDocuments(final boolean hasSupportingDocuments) {
            this.hasSupportingDocuments$value = hasSupportingDocuments;
            this.hasSupportingDocuments$set = true;
            return this;
        }

        @Generated
        public ClearanceRequestDTOBuilder additionalInfo(final AdditionalInfo additionalInfo) {
            this.additionalInfo = additionalInfo;
            return this;
        }

        @Generated
        public ClearanceRequestDTO build() {
            boolean allDepartments$value = this.allDepartments$value;
            if (!this.allDepartments$set) {
                allDepartments$value = ClearanceRequestDTO.$default$allDepartments();
            }

            boolean hasSupportingDocuments$value = this.hasSupportingDocuments$value;
            if (!this.hasSupportingDocuments$set) {
                hasSupportingDocuments$value = ClearanceRequestDTO.$default$hasSupportingDocuments();
            }

            return new ClearanceRequestDTO(this.registrationNumber, this.studentName, this.email, this.phoneNumber, this.programme, this.faculty, this.department, this.yearOfStudy, this.academicYear, this.semester, this.reason, this.comments, this.clearanceType, this.selectedDepartments, allDepartments$value, this.documents, hasSupportingDocuments$value, this.additionalInfo);
        }

        @Generated
        public String toString() {
            String var10000 = this.registrationNumber;
            return "ClearanceRequestDTO.ClearanceRequestDTOBuilder(registrationNumber=" + var10000 + ", studentName=" + this.studentName + ", email=" + this.email + ", phoneNumber=" + this.phoneNumber + ", programme=" + this.programme + ", faculty=" + this.faculty + ", department=" + this.department + ", yearOfStudy=" + this.yearOfStudy + ", academicYear=" + this.academicYear + ", semester=" + this.semester + ", reason=" + this.reason + ", comments=" + this.comments + ", clearanceType=" + String.valueOf(this.clearanceType) + ", selectedDepartments=" + String.valueOf(this.selectedDepartments) + ", allDepartments$value=" + this.allDepartments$value + ", documents=" + String.valueOf(this.documents) + ", hasSupportingDocuments$value=" + this.hasSupportingDocuments$value + ", additionalInfo=" + String.valueOf(this.additionalInfo) + ")";
        }
    }

    public static class DocumentDTO {
        private String documentName;
        private String documentType;
        private String documentUrl;
        private String description;

        @Generated
        public static DocumentDTOBuilder builder() {
            return new DocumentDTOBuilder();
        }

        @Generated
        public String getDocumentName() {
            return this.documentName;
        }

        @Generated
        public String getDocumentType() {
            return this.documentType;
        }

        @Generated
        public String getDocumentUrl() {
            return this.documentUrl;
        }

        @Generated
        public String getDescription() {
            return this.description;
        }

        @Generated
        public void setDocumentName(final String documentName) {
            this.documentName = documentName;
        }

        @Generated
        public void setDocumentType(final String documentType) {
            this.documentType = documentType;
        }

        @Generated
        public void setDocumentUrl(final String documentUrl) {
            this.documentUrl = documentUrl;
        }

        @Generated
        public void setDescription(final String description) {
            this.description = description;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof DocumentDTO)) {
                return false;
            } else {
                DocumentDTO other = (DocumentDTO)o;
                if (!other.canEqual(this)) {
                    return false;
                } else {
                    Object this$documentName = this.getDocumentName();
                    Object other$documentName = other.getDocumentName();
                    if (this$documentName == null) {
                        if (other$documentName != null) {
                            return false;
                        }
                    } else if (!this$documentName.equals(other$documentName)) {
                        return false;
                    }

                    Object this$documentType = this.getDocumentType();
                    Object other$documentType = other.getDocumentType();
                    if (this$documentType == null) {
                        if (other$documentType != null) {
                            return false;
                        }
                    } else if (!this$documentType.equals(other$documentType)) {
                        return false;
                    }

                    Object this$documentUrl = this.getDocumentUrl();
                    Object other$documentUrl = other.getDocumentUrl();
                    if (this$documentUrl == null) {
                        if (other$documentUrl != null) {
                            return false;
                        }
                    } else if (!this$documentUrl.equals(other$documentUrl)) {
                        return false;
                    }

                    Object this$description = this.getDescription();
                    Object other$description = other.getDescription();
                    if (this$description == null) {
                        if (other$description != null) {
                            return false;
                        }
                    } else if (!this$description.equals(other$description)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof DocumentDTO;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            Object $documentName = this.getDocumentName();
            result = result * 59 + ($documentName == null ? 43 : $documentName.hashCode());
            Object $documentType = this.getDocumentType();
            result = result * 59 + ($documentType == null ? 43 : $documentType.hashCode());
            Object $documentUrl = this.getDocumentUrl();
            result = result * 59 + ($documentUrl == null ? 43 : $documentUrl.hashCode());
            Object $description = this.getDescription();
            result = result * 59 + ($description == null ? 43 : $description.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            String var10000 = this.getDocumentName();
            return "ClearanceRequestDTO.DocumentDTO(documentName=" + var10000 + ", documentType=" + this.getDocumentType() + ", documentUrl=" + this.getDocumentUrl() + ", description=" + this.getDescription() + ")";
        }

        @Generated
        public DocumentDTO() {
        }

        @Generated
        public DocumentDTO(final String documentName, final String documentType, final String documentUrl, final String description) {
            this.documentName = documentName;
            this.documentType = documentType;
            this.documentUrl = documentUrl;
            this.description = description;
        }

        @Generated
        public static class DocumentDTOBuilder {
            @Generated
            private String documentName;
            @Generated
            private String documentType;
            @Generated
            private String documentUrl;
            @Generated
            private String description;

            @Generated
            DocumentDTOBuilder() {
            }

            @Generated
            public DocumentDTOBuilder documentName(final String documentName) {
                this.documentName = documentName;
                return this;
            }

            @Generated
            public DocumentDTOBuilder documentType(final String documentType) {
                this.documentType = documentType;
                return this;
            }

            @Generated
            public DocumentDTOBuilder documentUrl(final String documentUrl) {
                this.documentUrl = documentUrl;
                return this;
            }

            @Generated
            public DocumentDTOBuilder description(final String description) {
                this.description = description;
                return this;
            }

            @Generated
            public DocumentDTO build() {
                return new DocumentDTO(this.documentName, this.documentType, this.documentUrl, this.description);
            }

            @Generated
            public String toString() {
                return "ClearanceRequestDTO.DocumentDTO.DocumentDTOBuilder(documentName=" + this.documentName + ", documentType=" + this.documentType + ", documentUrl=" + this.documentUrl + ", description=" + this.description + ")";
            }
        }
    }

    public static class AdditionalInfo {
        private boolean hasOutstandingFees;
        private boolean hasLibraryFines;
        private boolean hasAcademicIssues;
        private String specialNotes;
        private String preferredContactMethod;

        @Generated
        public static AdditionalInfoBuilder builder() {
            return new AdditionalInfoBuilder();
        }

        @Generated
        public boolean isHasOutstandingFees() {
            return this.hasOutstandingFees;
        }

        @Generated
        public boolean isHasLibraryFines() {
            return this.hasLibraryFines;
        }

        @Generated
        public boolean isHasAcademicIssues() {
            return this.hasAcademicIssues;
        }

        @Generated
        public String getSpecialNotes() {
            return this.specialNotes;
        }

        @Generated
        public String getPreferredContactMethod() {
            return this.preferredContactMethod;
        }

        @Generated
        public void setHasOutstandingFees(final boolean hasOutstandingFees) {
            this.hasOutstandingFees = hasOutstandingFees;
        }

        @Generated
        public void setHasLibraryFines(final boolean hasLibraryFines) {
            this.hasLibraryFines = hasLibraryFines;
        }

        @Generated
        public void setHasAcademicIssues(final boolean hasAcademicIssues) {
            this.hasAcademicIssues = hasAcademicIssues;
        }

        @Generated
        public void setSpecialNotes(final String specialNotes) {
            this.specialNotes = specialNotes;
        }

        @Generated
        public void setPreferredContactMethod(final String preferredContactMethod) {
            this.preferredContactMethod = preferredContactMethod;
        }

        @Generated
        public boolean equals(final Object o) {
            if (o == this) {
                return true;
            } else if (!(o instanceof AdditionalInfo)) {
                return false;
            } else {
                AdditionalInfo other = (AdditionalInfo)o;
                if (!other.canEqual(this)) {
                    return false;
                } else if (this.isHasOutstandingFees() != other.isHasOutstandingFees()) {
                    return false;
                } else if (this.isHasLibraryFines() != other.isHasLibraryFines()) {
                    return false;
                } else if (this.isHasAcademicIssues() != other.isHasAcademicIssues()) {
                    return false;
                } else {
                    Object this$specialNotes = this.getSpecialNotes();
                    Object other$specialNotes = other.getSpecialNotes();
                    if (this$specialNotes == null) {
                        if (other$specialNotes != null) {
                            return false;
                        }
                    } else if (!this$specialNotes.equals(other$specialNotes)) {
                        return false;
                    }

                    Object this$preferredContactMethod = this.getPreferredContactMethod();
                    Object other$preferredContactMethod = other.getPreferredContactMethod();
                    if (this$preferredContactMethod == null) {
                        if (other$preferredContactMethod != null) {
                            return false;
                        }
                    } else if (!this$preferredContactMethod.equals(other$preferredContactMethod)) {
                        return false;
                    }

                    return true;
                }
            }
        }

        @Generated
        protected boolean canEqual(final Object other) {
            return other instanceof AdditionalInfo;
        }

        @Generated
        public int hashCode() {
            int PRIME = 59;
            int result = 1;
            result = result * 59 + (this.isHasOutstandingFees() ? 79 : 97);
            result = result * 59 + (this.isHasLibraryFines() ? 79 : 97);
            result = result * 59 + (this.isHasAcademicIssues() ? 79 : 97);
            Object $specialNotes = this.getSpecialNotes();
            result = result * 59 + ($specialNotes == null ? 43 : $specialNotes.hashCode());
            Object $preferredContactMethod = this.getPreferredContactMethod();
            result = result * 59 + ($preferredContactMethod == null ? 43 : $preferredContactMethod.hashCode());
            return result;
        }

        @Generated
        public String toString() {
            boolean var10000 = this.isHasOutstandingFees();
            return "ClearanceRequestDTO.AdditionalInfo(hasOutstandingFees=" + var10000 + ", hasLibraryFines=" + this.isHasLibraryFines() + ", hasAcademicIssues=" + this.isHasAcademicIssues() + ", specialNotes=" + this.getSpecialNotes() + ", preferredContactMethod=" + this.getPreferredContactMethod() + ")";
        }

        @Generated
        public AdditionalInfo() {
        }

        @Generated
        public AdditionalInfo(final boolean hasOutstandingFees, final boolean hasLibraryFines, final boolean hasAcademicIssues, final String specialNotes, final String preferredContactMethod) {
            this.hasOutstandingFees = hasOutstandingFees;
            this.hasLibraryFines = hasLibraryFines;
            this.hasAcademicIssues = hasAcademicIssues;
            this.specialNotes = specialNotes;
            this.preferredContactMethod = preferredContactMethod;
        }

        @Generated
        public static class AdditionalInfoBuilder {
            @Generated
            private boolean hasOutstandingFees;
            @Generated
            private boolean hasLibraryFines;
            @Generated
            private boolean hasAcademicIssues;
            @Generated
            private String specialNotes;
            @Generated
            private String preferredContactMethod;

            @Generated
            AdditionalInfoBuilder() {
            }

            @Generated
            public AdditionalInfoBuilder hasOutstandingFees(final boolean hasOutstandingFees) {
                this.hasOutstandingFees = hasOutstandingFees;
                return this;
            }

            @Generated
            public AdditionalInfoBuilder hasLibraryFines(final boolean hasLibraryFines) {
                this.hasLibraryFines = hasLibraryFines;
                return this;
            }

            @Generated
            public AdditionalInfoBuilder hasAcademicIssues(final boolean hasAcademicIssues) {
                this.hasAcademicIssues = hasAcademicIssues;
                return this;
            }

            @Generated
            public AdditionalInfoBuilder specialNotes(final String specialNotes) {
                this.specialNotes = specialNotes;
                return this;
            }

            @Generated
            public AdditionalInfoBuilder preferredContactMethod(final String preferredContactMethod) {
                this.preferredContactMethod = preferredContactMethod;
                return this;
            }

            @Generated
            public AdditionalInfo build() {
                return new AdditionalInfo(this.hasOutstandingFees, this.hasLibraryFines, this.hasAcademicIssues, this.specialNotes, this.preferredContactMethod);
            }

            @Generated
            public String toString() {
                return "ClearanceRequestDTO.AdditionalInfo.AdditionalInfoBuilder(hasOutstandingFees=" + this.hasOutstandingFees + ", hasLibraryFines=" + this.hasLibraryFines + ", hasAcademicIssues=" + this.hasAcademicIssues + ", specialNotes=" + this.specialNotes + ", preferredContactMethod=" + this.preferredContactMethod + ")";
            }
        }
    }

    public static enum ClearanceType {
        FINAL_YEAR_CLEARANCE("Final Year Clearance"),
        SEMESTER_CLEARANCE("Semester Clearance"),
        GRADUATION_CLEARANCE("Graduation Clearance"),
        DEPARTMENT_TRANSFER("Department Transfer"),
        OTHER("Other");

        private final String displayName;

        private ClearanceType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return this.displayName;
        }
    }
}
