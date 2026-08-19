
package com.UDSM.BACKEND.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Generated;

@Entity
@Table(
        name = "audit_logs"
)
public class AuditLog {
    @Id
    @GeneratedValue(
            strategy = GenerationType.UUID
    )
    private String id;
    @Column(
            name = "user_id"
    )
    private String userId;
    @Column(
            name = "username"
    )
    private String username;
    @Column(
            name = "action",
            nullable = false
    )
    private String action;
    @Column(
            name = "details",
            columnDefinition = "TEXT"
    )
    private String details;
    @Column(
            name = "ip_address"
    )
    private String ipAddress;
    @Column(
            name = "user_agent"
    )
    private String userAgent;
    @Column(
            name = "status"
    )
    private String status;
    @Column(
            name = "created_at"
    )
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @Generated
    public static AuditLogBuilder builder() {
        return new AuditLogBuilder();
    }

    @Generated
    public String getId() {
        return this.id;
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
    public String getAction() {
        return this.action;
    }

    @Generated
    public String getDetails() {
        return this.details;
    }

    @Generated
    public String getIpAddress() {
        return this.ipAddress;
    }

    @Generated
    public String getUserAgent() {
        return this.userAgent;
    }

    @Generated
    public String getStatus() {
        return this.status;
    }

    @Generated
    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @Generated
    public void setId(String id) {
        this.id = id;
    }

    @Generated
    public void setUserId(String userId) {
        this.userId = userId;
    }

    @Generated
    public void setUsername(String username) {
        this.username = username;
    }

    @Generated
    public void setAction(String action) {
        this.action = action;
    }

    @Generated
    public void setDetails(String details) {
        this.details = details;
    }

    @Generated
    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    @Generated
    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    @Generated
    public void setStatus(String status) {
        this.status = status;
    }

    @Generated
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public boolean equals(Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof AuditLog)) {
            return false;
        } else {
            AuditLog other = (AuditLog)o;
            if (!other.canEqual(this)) {
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

                Object this$action = this.getAction();
                Object other$action = other.getAction();
                if (this$action == null) {
                    if (other$action != null) {
                        return false;
                    }
                } else if (!this$action.equals(other$action)) {
                    return false;
                }

                Object this$details = this.getDetails();
                Object other$details = other.getDetails();
                if (this$details == null) {
                    if (other$details != null) {
                        return false;
                    }
                } else if (!this$details.equals(other$details)) {
                    return false;
                }

                Object this$ipAddress = this.getIpAddress();
                Object other$ipAddress = other.getIpAddress();
                if (this$ipAddress == null) {
                    if (other$ipAddress != null) {
                        return false;
                    }
                } else if (!this$ipAddress.equals(other$ipAddress)) {
                    return false;
                }

                Object this$userAgent = this.getUserAgent();
                Object other$userAgent = other.getUserAgent();
                if (this$userAgent == null) {
                    if (other$userAgent != null) {
                        return false;
                    }
                } else if (!this$userAgent.equals(other$userAgent)) {
                    return false;
                }

                Object this$status = this.getStatus();
                Object other$status = other.getStatus();
                if (this$status == null) {
                    if (other$status != null) {
                        return false;
                    }
                } else if (!this$status.equals(other$status)) {
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

                return true;
            }
        }
    }

    @Generated
    protected boolean canEqual(Object other) {
        return other instanceof AuditLog;
    }

    @Generated
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $id = this.getId();
        result = result * 59 + ($id == null ? 43 : $id.hashCode());
        Object $userId = this.getUserId();
        result = result * 59 + ($userId == null ? 43 : $userId.hashCode());
        Object $username = this.getUsername();
        result = result * 59 + ($username == null ? 43 : $username.hashCode());
        Object $action = this.getAction();
        result = result * 59 + ($action == null ? 43 : $action.hashCode());
        Object $details = this.getDetails();
        result = result * 59 + ($details == null ? 43 : $details.hashCode());
        Object $ipAddress = this.getIpAddress();
        result = result * 59 + ($ipAddress == null ? 43 : $ipAddress.hashCode());
        Object $userAgent = this.getUserAgent();
        result = result * 59 + ($userAgent == null ? 43 : $userAgent.hashCode());
        Object $status = this.getStatus();
        result = result * 59 + ($status == null ? 43 : $status.hashCode());
        Object $createdAt = this.getCreatedAt();
        result = result * 59 + ($createdAt == null ? 43 : $createdAt.hashCode());
        return result;
    }

    @Generated
    public String toString() {
        String var10000 = this.getId();
        return "AuditLog(id=" + var10000 + ", userId=" + this.getUserId() + ", username=" + this.getUsername() + ", action=" + this.getAction() + ", details=" + this.getDetails() + ", ipAddress=" + this.getIpAddress() + ", userAgent=" + this.getUserAgent() + ", status=" + this.getStatus() + ", createdAt=" + String.valueOf(this.getCreatedAt()) + ")";
    }

    @Generated
    public AuditLog() {
    }

    @Generated
    public AuditLog(String id, String userId, String username, String action, String details, String ipAddress, String userAgent, String status, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.username = username;
        this.action = action;
        this.details = details;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.status = status;
        this.createdAt = createdAt;
    }

    @Generated
    public static class AuditLogBuilder {
        @Generated
        private String id;
        @Generated
        private String userId;
        @Generated
        private String username;
        @Generated
        private String action;
        @Generated
        private String details;
        @Generated
        private String ipAddress;
        @Generated
        private String userAgent;
        @Generated
        private String status;
        @Generated
        private LocalDateTime createdAt;

        @Generated
        AuditLogBuilder() {
        }

        @Generated
        public AuditLogBuilder id(String id) {
            this.id = id;
            return this;
        }

        @Generated
        public AuditLogBuilder userId(String userId) {
            this.userId = userId;
            return this;
        }

        @Generated
        public AuditLogBuilder username(String username) {
            this.username = username;
            return this;
        }

        @Generated
        public AuditLogBuilder action(String action) {
            this.action = action;
            return this;
        }

        @Generated
        public AuditLogBuilder details(String details) {
            this.details = details;
            return this;
        }

        @Generated
        public AuditLogBuilder ipAddress(String ipAddress) {
            this.ipAddress = ipAddress;
            return this;
        }

        @Generated
        public AuditLogBuilder userAgent(String userAgent) {
            this.userAgent = userAgent;
            return this;
        }

        @Generated
        public AuditLogBuilder status(String status) {
            this.status = status;
            return this;
        }

        @Generated
        public AuditLogBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        @Generated
        public AuditLog build() {
            return new AuditLog(this.id, this.userId, this.username, this.action, this.details, this.ipAddress, this.userAgent, this.status, this.createdAt);
        }

        @Generated
        public String toString() {
            String var10000 = this.id;
            return "AuditLog.AuditLogBuilder(id=" + var10000 + ", userId=" + this.userId + ", username=" + this.username + ", action=" + this.action + ", details=" + this.details + ", ipAddress=" + this.ipAddress + ", userAgent=" + this.userAgent + ", status=" + this.status + ", createdAt=" + String.valueOf(this.createdAt) + ")";
        }
    }
}
