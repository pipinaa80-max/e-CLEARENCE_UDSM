//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by Fernflower decompiler)
//

package com.UDSM.BACKEND.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Generated;

@Entity
@Table(
        name = "notifications"
)
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "type")
    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(name = "is_read")
    private boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "link")
    private String link;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @Generated
    public static NotificationBuilder builder() {
        return new NotificationBuilder();
    }

    @Generated
    public String getId() {
        return this.id;
    }

    @Generated
    public User getUser() {
        return this.user;
    }

    @Generated
    public Student getStudent() {
        return this.student;
    }

    @Generated
    public String getTitle() {
        return this.title;
    }

    @Generated
    public String getMessage() {
        return this.message;
    }

    @Generated
    public NotificationType getType() {
        return this.type;
    }

    @Generated
    public boolean isRead() {
        return this.isRead;
    }

    @Generated
    public LocalDateTime getReadAt() {
        return this.readAt;
    }

    @Generated
    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @Generated
    public String getLink() {
        return this.link;
    }

    @Generated
    public void setId(String id) {
        this.id = id;
    }

    @Generated
    public void setUser(User user) {
        this.user = user;
    }

    @Generated
    public void setStudent(Student student) {
        this.student = student;
    }

    @Generated
    public void setTitle(String title) {
        this.title = title;
    }

    @Generated
    public void setMessage(String message) {
        this.message = message;
    }

    @Generated
    public void setType(NotificationType type) {
        this.type = type;
    }

    @Generated
    public void setRead(boolean isRead) {
        this.isRead = isRead;
    }

    @Generated
    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    @Generated
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public void setLink(String link) {
        this.link = link;
    }

    @Generated
    public boolean equals(Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof Notification)) {
            return false;
        } else {
            Notification other = (Notification)o;
            if (!other.canEqual(this)) {
                return false;
            } else if (this.isRead() != other.isRead()) {
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

                Object this$user = this.getUser();
                Object other$user = other.getUser();
                if (this$user == null) {
                    if (other$user != null) {
                        return false;
                    }
                } else if (!this$user.equals(other$user)) {
                    return false;
                }

                Object this$student = this.getStudent();
                Object other$student = other.getStudent();
                if (this$student == null) {
                    if (other$student != null) {
                        return false;
                    }
                } else if (!this$student.equals(other$student)) {
                    return false;
                }

                Object this$title = this.getTitle();
                Object other$title = other.getTitle();
                if (this$title == null) {
                    if (other$title != null) {
                        return false;
                    }
                } else if (!this$title.equals(other$title)) {
                    return false;
                }

                Object this$message = this.getMessage();
                Object other$message = other.getMessage();
                if (this$message == null) {
                    if (other$message != null) {
                        return false;
                    }
                } else if (!this$message.equals(other$message)) {
                    return false;
                }

                Object this$type = this.getType();
                Object other$type = other.getType();
                if (this$type == null) {
                    if (other$type != null) {
                        return false;
                    }
                } else if (!this$type.equals(other$type)) {
                    return false;
                }

                Object this$readAt = this.getReadAt();
                Object other$readAt = other.getReadAt();
                if (this$readAt == null) {
                    if (other$readAt != null) {
                        return false;
                    }
                } else if (!this$readAt.equals(other$readAt)) {
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

                Object this$link = this.getLink();
                Object other$link = other.getLink();
                if (this$link == null) {
                    if (other$link != null) {
                        return false;
                    }
                } else if (!this$link.equals(other$link)) {
                    return false;
                }

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(Object other) {
        return other instanceof Notification;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + (this.isRead() ? 79 : 97);
        Object $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $user = this.getUser();
        result = result * 59 + ($user == null ? 43 : $user.hashCode());
        Object $student = this.getStudent();
        result = result * 59 + ($student == null ? 43 : $student.hashCode());
        Object $title = this.getTitle();
        result = result * 59 + ($title == null ? 43 : $title.hashCode());
        Object $message = this.getMessage();
        result = result * 59 + ($message == null ? 43 : $message.hashCode());
        Object $type = this.getType();
        result = result * 59 + ($type == null ? 43 : $type.hashCode());
        Object $readAt = this.getReadAt();
        result = result * 59 + ($readAt == null ? 43 : $readAt.hashCode());
        Object $createdAt = this.getCreatedAt();
        result = result * 59 + ($createdAt == null ? 43 : $createdAt.hashCode());
        Object $link = this.getLink();
        result = result * 59 + ($link == null ? 43 : $link.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getId();
        return "Notification(id=" + var10000 + ", user=" + String.valueOf(this.getUser()) + ", student=" + String.valueOf(this.getStudent()) + ", title=" + this.getTitle() + ", message=" + this.getMessage() + ", type=" + String.valueOf(this.getType()) + ", isRead=" + this.isRead() + ", readAt=" + String.valueOf(this.getReadAt()) + ", createdAt=" + String.valueOf(this.getCreatedAt()) + ", link=" + this.getLink() + ")";
    }

    @Generated
    public Notification() {
    }

    @Generated
    public Notification(String id, User user, Student student, String title, String message, NotificationType type, boolean isRead, LocalDateTime readAt, LocalDateTime createdAt, String link) {
        this.id = id;
        this.user = user;
        this.student = student;
        this.title = title;
        this.message = message;
        this.type = type;
        this.isRead = isRead;
        this.readAt = readAt;
        this.createdAt = createdAt;
        this.link = link;
    }

    @Generated
    public static class NotificationBuilder {
        @Generated
        private String id;
        @Generated
        private User user;
        @Generated
        private Student student;
        @Generated
        private String title;
        @Generated
        private String message;
        @Generated
        private NotificationType type;
        @Generated
        private boolean isRead;
        @Generated
        private LocalDateTime readAt;
        @Generated
        private LocalDateTime createdAt;
        @Generated
        private String link;

        @Generated
        NotificationBuilder() {
        }

        @Generated
        public NotificationBuilder id(String id) {
            this.id = id;
            return this;
        }

        @Generated
        public NotificationBuilder user(User user) {
            this.user = user;
            return this;
        }

        @Generated
        public NotificationBuilder student(Student student) {
            this.student = student;
            return this;
        }

        @Generated
        public NotificationBuilder title(String title) {
            this.title = title;
            return this;
        }

        @Generated
        public NotificationBuilder message(String message) {
            this.message = message;
            return this;
        }

        @Generated
        public NotificationBuilder type(NotificationType type) {
            this.type = type;
            return this;
        }

        @Generated
        public NotificationBuilder isRead(boolean isRead) {
            this.isRead = isRead;
            return this;
        }

        @Generated
        public NotificationBuilder readAt(LocalDateTime readAt) {
            this.readAt = readAt;
            return this;
        }

        @Generated
        public NotificationBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        @Generated
        public NotificationBuilder link(String link) {
            this.link = link;
            return this;
        }

        @Generated
        public Notification build() {
            return new Notification(this.id, this.user, this.student, this.title, this.message, this.type, this.isRead, this.readAt, this.createdAt, this.link);
        }

        @Generated
        public String toString() {
            String var10000 = this.id;
            return "Notification.NotificationBuilder(id=" + var10000 + ", user=" + String.valueOf(this.user) + ", student=" + String.valueOf(this.student) + ", title=" + this.title + ", message=" + this.message + ", type=" + String.valueOf(this.type) + ", isRead=" + this.isRead + ", readAt=" + String.valueOf(this.readAt) + ", createdAt=" + String.valueOf(this.createdAt) + ", link=" + this.link + ")";
        }
    }
}
