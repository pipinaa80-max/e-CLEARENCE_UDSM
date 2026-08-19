package com.UDSM.BACKEND.dto;

import lombok.Generated;
import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Setter
@Getter
public class DocumentDTO {
    @NotBlank(message = "Student ID is required")
    private String studentId;

    @NotBlank(message = "File name is required")
    @Size(max = 255, message = "File name must not exceed 255 characters")
    private String fileName;

    @NotBlank(message = "File type is required")
    private String fileType; // This will be the category

    private Long fileSize;
    private String description;

    // This will be set by the server
    private String fileUrl;

    @Generated
    public static DocumentDTOBuilder builder() {
        return new DocumentDTOBuilder();
    }

    @Generated
    public String getStudentId() {
        return this.studentId;
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
    public Long getFileSize() {
        return this.fileSize;
    }

    @Generated
    public String getDescription() {
        return this.description;
    }

    @Generated
    public String getFileUrl() {
        return this.fileUrl;
    }

    @Generated
    public void setStudentId(String studentId) {
        this.studentId = studentId;
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
    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    @Generated
    public void setDescription(String description) {
        this.description = description;
    }

    @Generated
    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    @Generated
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof DocumentDTO)) return false;
        DocumentDTO other = (DocumentDTO) o;
        if (!other.canEqual(this)) return false;

        Object this$studentId = this.getStudentId();
        Object other$studentId = other.getStudentId();
        if (this$studentId == null ? other$studentId != null : !this$studentId.equals(other$studentId)) return false;

        Object this$fileName = this.getFileName();
        Object other$fileName = other.getFileName();
        if (this$fileName == null ? other$fileName != null : !this$fileName.equals(other$fileName)) return false;

        Object this$fileType = this.getFileType();
        Object other$fileType = other.getFileType();
        if (this$fileType == null ? other$fileType != null : !this$fileType.equals(other$fileType)) return false;

        Object this$fileSize = this.getFileSize();
        Object other$fileSize = other.getFileSize();
        if (this$fileSize == null ? other$fileSize != null : !this$fileSize.equals(other$fileSize)) return false;

        Object this$description = this.getDescription();
        Object other$description = other.getDescription();
        if (this$description == null ? other$description != null : !this$description.equals(other$description)) return false;

        Object this$fileUrl = this.getFileUrl();
        Object other$fileUrl = other.getFileUrl();
        if (this$fileUrl == null ? other$fileUrl != null : !this$fileUrl.equals(other$fileUrl)) return false;

        return true;
    }

    @Generated
    protected boolean canEqual(Object other) {
        return other instanceof DocumentDTO;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $studentId = this.getStudentId();
        result = result * 59 + ($studentId == null ? 43 : $studentId.hashCode());
        Object $fileName = this.getFileName();
        result = result * 59 + ($fileName == null ? 43 : $fileName.hashCode());
        Object $fileType = this.getFileType();
        result = result * 59 + ($fileType == null ? 43 : $fileType.hashCode());
        Object $fileSize = this.getFileSize();
        result = result * 59 + ($fileSize == null ? 43 : $fileSize.hashCode());
        Object $description = this.getDescription();
        result = result * 59 + ($description == null ? 43 : $description.hashCode());
        Object $fileUrl = this.getFileUrl();
        result = result * 59 + ($fileUrl == null ? 43 : $fileUrl.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        return "DocumentDTO(studentId=" + this.getStudentId() + ", fileName=" + this.getFileName() +
                ", fileType=" + this.getFileType() + ", fileSize=" + this.getFileSize() +
                ", description=" + this.getDescription() + ", fileUrl=" + this.getFileUrl() + ")";
    }

    @Generated
    public DocumentDTO() {
    }

    @Generated
    public DocumentDTO(String studentId, String fileName, String fileType, Long fileSize, String description, String fileUrl) {
        this.studentId = studentId;
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.description = description;
        this.fileUrl = fileUrl;
    }

    @Generated
    public static class DocumentDTOBuilder {
        private String studentId;
        private String fileName;
        private String fileType;
        private Long fileSize;
        private String description;
        private String fileUrl;

        @Generated
        DocumentDTOBuilder() {
        }

        @Generated
        public DocumentDTOBuilder studentId(String studentId) {
            this.studentId = studentId;
            return this;
        }

        @Generated
        public DocumentDTOBuilder fileName(String fileName) {
            this.fileName = fileName;
            return this;
        }

        @Generated
        public DocumentDTOBuilder fileType(String fileType) {
            this.fileType = fileType;
            return this;
        }

        @Generated
        public DocumentDTOBuilder fileSize(Long fileSize) {
            this.fileSize = fileSize;
            return this;
        }

        @Generated
        public DocumentDTOBuilder description(String description) {
            this.description = description;
            return this;
        }

        @Generated
        public DocumentDTOBuilder fileUrl(String fileUrl) {
            this.fileUrl = fileUrl;
            return this;
        }

        @Generated
        public DocumentDTO build() {
            return new DocumentDTO(this.studentId, this.fileName, this.fileType, this.fileSize, this.description, this.fileUrl);
        }

        @Generated
        public String toString() {
            return "DocumentDTO.DocumentDTOBuilder(studentId=" + this.studentId + ", fileName=" + this.fileName +
                    ", fileType=" + this.fileType + ", fileSize=" + this.fileSize + ", description=" + this.description +
                    ", fileUrl=" + this.fileUrl + ")";
        }
    }
}