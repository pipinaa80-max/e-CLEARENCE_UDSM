package com.UDSM.BACKEND.Model;

import jakarta.persistence.*;
import lombok.Generated;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Setter
@Getter
@Table(name = "documents")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "description")
    private String description;

    @Column(name = "upload_date")
    private LocalDateTime uploadDate;

    @Column(name = "document_category")
    @Enumerated(EnumType.STRING)
    private DocumentCategory category;

    @Column(name = "is_verified")
    private boolean verified = false;

    @Column(name = "verified_by")
    private String verifiedBy;

    @Column(name = "verified_date")
    private LocalDateTime verifiedDate;

    @Column(name = "verification_comment")
    private String verificationComment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @PrePersist
    protected void onCreate() {
        this.uploadDate = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.uploadDate = LocalDateTime.now();
    }

    @Generated
    public static DocumentBuilder builder() {
        return new DocumentBuilder();
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
    public DocumentCategory getCategory() {
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
    public Student getStudent() {
        return this.student;
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
    public void setCategory(DocumentCategory category) {
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
    public void setStudent(Student student) {
        this.student = student;
    }

    @Generated
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof Document)) return false;
        Document other = (Document) o;
        if (!other.canEqual(this)) return false;
        if (this.isVerified() != other.isVerified()) return false;

        Object this$id = this.getId();
        Object other$id = other.getId();
        if (this$id == null ? other$id != null : !this$id.equals(other$id)) return false;

        Object this$fileName = this.getFileName();
        Object other$fileName = other.getFileName();
        if (this$fileName == null ? other$fileName != null : !this$fileName.equals(other$fileName)) return false;

        Object this$fileType = this.getFileType();
        Object other$fileType = other.getFileType();
        if (this$fileType == null ? other$fileType != null : !this$fileType.equals(other$fileType)) return false;

        Object this$fileUrl = this.getFileUrl();
        Object other$fileUrl = other.getFileUrl();
        if (this$fileUrl == null ? other$fileUrl != null : !this$fileUrl.equals(other$fileUrl)) return false;

        Object this$fileSize = this.getFileSize();
        Object other$fileSize = other.getFileSize();
        if (this$fileSize == null ? other$fileSize != null : !this$fileSize.equals(other$fileSize)) return false;

        Object this$description = this.getDescription();
        Object other$description = other.getDescription();
        if (this$description == null ? other$description != null : !this$description.equals(other$description)) return false;

        Object this$uploadDate = this.getUploadDate();
        Object other$uploadDate = other.getUploadDate();
        if (this$uploadDate == null ? other$uploadDate != null : !this$uploadDate.equals(other$uploadDate)) return false;

        Object this$category = this.getCategory();
        Object other$category = other.getCategory();
        if (this$category == null ? other$category != null : !this$category.equals(other$category)) return false;

        Object this$verifiedBy = this.getVerifiedBy();
        Object other$verifiedBy = other.getVerifiedBy();
        if (this$verifiedBy == null ? other$verifiedBy != null : !this$verifiedBy.equals(other$verifiedBy)) return false;

        Object this$verifiedDate = this.getVerifiedDate();
        Object other$verifiedDate = other.getVerifiedDate();
        if (this$verifiedDate == null ? other$verifiedDate != null : !this$verifiedDate.equals(other$verifiedDate)) return false;

        Object this$verificationComment = this.getVerificationComment();
        Object other$verificationComment = other.getVerificationComment();
        if (this$verificationComment == null ? other$verificationComment != null : !this$verificationComment.equals(other$verificationComment)) return false;

        Object this$student = this.getStudent();
        Object other$student = other.getStudent();
        if (this$student == null ? other$student != null : !this$student.equals(other$student)) return false;

        return true;
    }

    @Generated
    protected boolean canEqual(Object other) {
        return other instanceof Document;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isVerified() ? 79 : 97);
        Object $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $fileName = this.getFileName();
        result = result * 59 + ($fileName == null ? 43 : $fileName.hashCode());
        Object $fileType = this.getFileType();
        result = result * 59 + ($fileType == null ? 43 : $fileType.hashCode());
        Object $fileUrl = this.getFileUrl();
        result = result * 59 + ($fileUrl == null ? 43 : $fileUrl.hashCode());
        Object $fileSize = this.getFileSize();
        result = result * 59 + ($fileSize == null ? 43 : $fileSize.hashCode());
        Object $description = this.getDescription();
        result = result * 59 + ($description == null ? 43 : $description.hashCode());
        Object $uploadDate = this.getUploadDate();
        result = result * 59 + ($uploadDate == null ? 43 : $uploadDate.hashCode());
        Object $category = this.getCategory();
        result = result * 59 + ($category == null ? 43 : $category.hashCode());
        Object $verifiedBy = this.getVerifiedBy();
        result = result * 59 + ($verifiedBy == null ? 43 : $verifiedBy.hashCode());
        Object $verifiedDate = this.getVerifiedDate();
        result = result * 59 + ($verifiedDate == null ? 43 : $verifiedDate.hashCode());
        Object $verificationComment = this.getVerificationComment();
        result = result * 59 + ($verificationComment == null ? 43 : $verificationComment.hashCode());
        Object $student = this.getStudent();
        result = result * 59 + ($student == null ? 43 : $student.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        return "Document(id=" + this.getId() + ", fileName=" + this.getFileName() + ", fileType=" + this.getFileType() +
                ", fileUrl=" + this.getFileUrl() + ", fileSize=" + this.getFileSize() + ", description=" + this.getDescription() +
                ", uploadDate=" + String.valueOf(this.getUploadDate()) + ", category=" + String.valueOf(this.getCategory()) +
                ", verified=" + this.isVerified() + ", verifiedBy=" + this.getVerifiedBy() +
                ", verifiedDate=" + String.valueOf(this.getVerifiedDate()) + ", verificationComment=" + this.getVerificationComment() +
                ", student=" + String.valueOf(this.getStudent()) + ")";
    }

    @Generated
    public Document() {
    }

    @Generated
    public Document(String id, String fileName, String fileType, String fileUrl, Long fileSize, String description,
                    LocalDateTime uploadDate, DocumentCategory category, boolean verified, String verifiedBy,
                    LocalDateTime verifiedDate, String verificationComment, Student student) {
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
        this.student = student;
    }

    @Generated
    public static class DocumentBuilder {
        private String id;
        private String fileName;
        private String fileType;
        private String fileUrl;
        private Long fileSize;
        private String description;
        private LocalDateTime uploadDate;
        private DocumentCategory category;
        private boolean verified;
        private String verifiedBy;
        private LocalDateTime verifiedDate;
        private String verificationComment;
        private Student student;

        @Generated
        DocumentBuilder() {
        }

        @Generated
        public DocumentBuilder id(String id) {
            this.id = id;
            return this;
        }

        @Generated
        public DocumentBuilder fileName(String fileName) {
            this.fileName = fileName;
            return this;
        }

        @Generated
        public DocumentBuilder fileType(String fileType) {
            this.fileType = fileType;
            return this;
        }

        @Generated
        public DocumentBuilder fileUrl(String fileUrl) {
            this.fileUrl = fileUrl;
            return this;
        }

        @Generated
        public DocumentBuilder fileSize(Long fileSize) {
            this.fileSize = fileSize;
            return this;
        }

        @Generated
        public DocumentBuilder description(String description) {
            this.description = description;
            return this;
        }

        @Generated
        public DocumentBuilder uploadDate(LocalDateTime uploadDate) {
            this.uploadDate = uploadDate;
            return this;
        }

        @Generated
        public DocumentBuilder category(DocumentCategory category) {
            this.category = category;
            return this;
        }

        @Generated
        public DocumentBuilder verified(boolean verified) {
            this.verified = verified;
            return this;
        }

        @Generated
        public DocumentBuilder verifiedBy(String verifiedBy) {
            this.verifiedBy = verifiedBy;
            return this;
        }

        @Generated
        public DocumentBuilder verifiedDate(LocalDateTime verifiedDate) {
            this.verifiedDate = verifiedDate;
            return this;
        }

        @Generated
        public DocumentBuilder verificationComment(String verificationComment) {
            this.verificationComment = verificationComment;
            return this;
        }

        @Generated
        public DocumentBuilder student(Student student) {
            this.student = student;
            return this;
        }

        @Generated
        public Document build() {
            return new Document(this.id, this.fileName, this.fileType, this.fileUrl, this.fileSize, this.description,
                    this.uploadDate, this.category, this.verified, this.verifiedBy,
                    this.verifiedDate, this.verificationComment, this.student);
        }

        @Generated
        public String toString() {
            return "Document.DocumentBuilder(id=" + this.id + ", fileName=" + this.fileName + ", fileType=" + this.fileType +
                    ", fileUrl=" + this.fileUrl + ", fileSize=" + this.fileSize + ", description=" + this.description +
                    ", uploadDate=" + String.valueOf(this.uploadDate) + ", category=" + String.valueOf(this.category) +
                    ", verified=" + this.verified + ", verifiedBy=" + this.verifiedBy +
                    ", verifiedDate=" + String.valueOf(this.verifiedDate) + ", verificationComment=" + this.verificationComment +
                    ", student=" + String.valueOf(this.student) + ")";
        }
    }
}