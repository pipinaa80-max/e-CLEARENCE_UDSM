package com.UDSM.BACKEND.dto;

import com.UDSM.BACKEND.Model.Document;
import lombok.Generated;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.List;

@Setter
@Getter
public class DocumentResponse {
    private String id;
    private String fileName;
    private String fileType;
    private String fileUrl;
    private Long fileSize;
    private String description;
    private LocalDateTime uploadDate;
    private String category;
    private boolean verified;
    private String verifiedBy;
    private LocalDateTime verifiedDate;
    private String verificationComment;
    private String studentId;
    private String studentName;
    private boolean hasAllRequiredDocuments;
    private List<String> missingDocuments;

    public static DocumentResponse fromDocument(Document document) {
        DocumentResponse response = new DocumentResponse();
        response.setId(document.getId());
        response.setFileName(document.getFileName());
        response.setFileType(document.getFileType());
        response.setFileUrl(document.getFileUrl());
        response.setFileSize(document.getFileSize());
        response.setDescription(document.getDescription());
        response.setUploadDate(document.getUploadDate());
        response.setCategory(document.getCategory() != null ? document.getCategory().getDisplayName() : null);
        response.setVerified(document.isVerified());
        response.setVerifiedBy(document.getVerifiedBy());
        response.setVerifiedDate(document.getVerifiedDate());
        response.setVerificationComment(document.getVerificationComment());

        if (document.getStudent() != null) {
            response.setStudentId(document.getStudent().getId());
            response.setStudentName(document.getStudent().getFullName());
        }

        return response;
    }

    @Generated
    public static DocumentResponseBuilder builder() {
        return new DocumentResponseBuilder();
    }

    @Generated
    public String getId() {
        return this.id;
    }

    @Generated
    public String getFileName() {
        return this.fileName;
    }

    @Generated
    public String getFileType() {
        return this.fileType;
    }

    @Generated
    public String getFileUrl() {
        return this.fileUrl;
    }

    @Generated
    public Long getFileSize() {
        return this.fileSize;
    }

    @Generated
    public String getDescription() {
        return this.description;
    }

    @Generated
    public LocalDateTime getUploadDate() {
        return this.uploadDate;
    }

    @Generated
    public String getCategory() {
        return this.category;
    }

    @Generated
    public boolean isVerified() {
        return this.verified;
    }

    @Generated
    public String getVerifiedBy() {
        return this.verifiedBy;
    }

    @Generated
    public LocalDateTime getVerifiedDate() {
        return this.verifiedDate;
    }

    @Generated
    public String getVerificationComment() {
        return this.verificationComment;
    }

    @Generated
    public String getStudentId() {
        return this.studentId;
    }

    @Generated
    public String getStudentName() {
        return this.studentName;
    }

    @Generated
    public boolean isHasAllRequiredDocuments() {
        return this.hasAllRequiredDocuments;
    }

    @Generated
    public List<String> getMissingDocuments() {
        return this.missingDocuments;
    }

    @Generated
    public void setId(String id) {
        this.id = id;
    }

    @Generated
    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    @Generated
    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    @Generated
    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    @Generated
    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    @Generated
    public void setDescription(String description) {
        this.description = description;
    }

    @Generated
    public void setUploadDate(LocalDateTime uploadDate) {
        this.uploadDate = uploadDate;
    }

    @Generated
    public void setCategory(String category) {
        this.category = category;
    }

    @Generated
    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    @Generated
    public void setVerifiedBy(String verifiedBy) {
        this.verifiedBy = verifiedBy;
    }

    @Generated
    public void setVerifiedDate(LocalDateTime verifiedDate) {
        this.verifiedDate = verifiedDate;
    }

    @Generated
    public void setVerificationComment(String verificationComment) {
        this.verificationComment = verificationComment;
    }

    @Generated
    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    @Generated
    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    @Generated
    public void setHasAllRequiredDocuments(boolean hasAllRequiredDocuments) {
        this.hasAllRequiredDocuments = hasAllRequiredDocuments;
    }

    @Generated
    public void setMissingDocuments(List<String> missingDocuments) {
        this.missingDocuments = missingDocuments;
    }

    @Generated
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof DocumentResponse)) return false;
        DocumentResponse other = (DocumentResponse) o;
        if (!other.canEqual(this)) return false;
        if (this.isVerified() != other.isVerified()) return false;
        if (this.isHasAllRequiredDocuments() != other.isHasAllRequiredDocuments()) return false;

        Object this$id = this.getId();
        Object other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) return false;

        // ... continue with other fields comparison

        return true;
    }

    @Generated
    protected boolean canEqual(Object other) {
        return other instanceof DocumentResponse;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isVerified() ? 79 : 97);
        result = result * 59 + (this.isHasAllRequiredDocuments() ? 79 : 97);
        // ... continue with other fields
        return result;
    }

    @Generated
    public DocumentResponse() {
    }

    @Generated
    public DocumentResponse(String id, String fileName, String fileType, String fileUrl, Long fileSize, String description,
                            LocalDateTime uploadDate, String category, boolean verified, String verifiedBy,
                            LocalDateTime verifiedDate, String verificationComment, String studentId,
                            String studentName, boolean hasAllRequiredDocuments, List<String> missingDocuments) {
        this.id = id;
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileUrl = fileUrl;
        this.fileSize = fileSize;
        this.description = description;
        this.uploadDate = uploadDate;
        this.category = category;
        this.verified = verified;
        this.verifiedBy = verifiedBy;
        this.verifiedDate = verifiedDate;
        this.verificationComment = verificationComment;
        this.studentId = studentId;
        this.studentName = studentName;
        this.hasAllRequiredDocuments = hasAllRequiredDocuments;
        this.missingDocuments = missingDocuments;
    }

    @Generated
    public static class DocumentResponseBuilder {
        private String id;
        private String fileName;
        private String fileType;
        private String fileUrl;
        private Long fileSize;
        private String description;
        private LocalDateTime uploadDate;
        private String category;
        private boolean verified;
        private String verifiedBy;
        private LocalDateTime verifiedDate;
        private String verificationComment;
        private String studentId;
        private String studentName;
        private boolean hasAllRequiredDocuments;
        private List<String> missingDocuments;

        @Generated
        DocumentResponseBuilder() {
        }

        @Generated
        public DocumentResponseBuilder id(String id) {
            this.id = id;
            return this;
        }

        @Generated
        public DocumentResponseBuilder fileName(String fileName) {
            this.fileName = fileName;
            return this;
        }

        @Generated
        public DocumentResponseBuilder fileType(String fileType) {
            this.fileType = fileType;
            return this;
        }

        @Generated
        public DocumentResponseBuilder fileUrl(String fileUrl) {
            this.fileUrl = fileUrl;
            return this;
        }

        @Generated
        public DocumentResponseBuilder fileSize(Long fileSize) {
            this.fileSize = fileSize;
            return this;
        }

        @Generated
        public DocumentResponseBuilder description(String description) {
            this.description = description;
            return this;
        }

        @Generated
        public DocumentResponseBuilder uploadDate(LocalDateTime uploadDate) {
            this.uploadDate = uploadDate;
            return this;
        }

        @Generated
        public DocumentResponseBuilder category(String category) {
            this.category = category;
            return this;
        }

        @Generated
        public DocumentResponseBuilder verified(boolean verified) {
            this.verified = verified;
            return this;
        }

        @Generated
        public DocumentResponseBuilder verifiedBy(String verifiedBy) {
            this.verifiedBy = verifiedBy;
            return this;
        }

        @Generated
        public DocumentResponseBuilder verifiedDate(LocalDateTime verifiedDate) {
            this.verifiedDate = verifiedDate;
            return this;
        }

        @Generated
        public DocumentResponseBuilder verificationComment(String verificationComment) {
            this.verificationComment = verificationComment;
            return this;
        }

        @Generated
        public DocumentResponseBuilder studentId(String studentId) {
            this.studentId = studentId;
            return this;
        }

        @Generated
        public DocumentResponseBuilder studentName(String studentName) {
            this.studentName = studentName;
            return this;
        }

        @Generated
        public DocumentResponseBuilder hasAllRequiredDocuments(boolean hasAllRequiredDocuments) {
            this.hasAllRequiredDocuments = hasAllRequiredDocuments;
            return this;
        }

        @Generated
        public DocumentResponseBuilder missingDocuments(List<String> missingDocuments) {
            this.missingDocuments = missingDocuments;
            return this;
        }

        @Generated
        public DocumentResponse build() {
            return new DocumentResponse(this.id, this.fileName, this.fileType, this.fileUrl, this.fileSize, this.description,
                    this.uploadDate, this.category, this.verified, this.verifiedBy, this.verifiedDate,
                    this.verificationComment, this.studentId, this.studentName,
                    this.hasAllRequiredDocuments, this.missingDocuments);
        }

        @Generated
        public String toString() {
            return "DocumentResponse.DocumentResponseBuilder(id=" + this.id + ", fileName=" + this.fileName +
                    ", fileType=" + this.fileType + ", fileUrl=" + this.fileUrl + ", fileSize=" + this.fileSize +
                    ", description=" + this.description + ", uploadDate=" + String.valueOf(this.uploadDate) +
                    ", category=" + this.category + ", verified=" + this.verified + ", verifiedBy=" + this.verifiedBy +
                    ", verifiedDate=" + String.valueOf(this.verifiedDate) + ", verificationComment=" + this.verificationComment +
                    ", studentId=" + this.studentId + ", studentName=" + this.studentName +
                    ", hasAllRequiredDocuments=" + this.hasAllRequiredDocuments +
                    ", missingDocuments=" + String.valueOf(this.missingDocuments) + ")";
        }
    }
}