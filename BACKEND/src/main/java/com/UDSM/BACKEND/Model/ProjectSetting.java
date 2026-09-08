package com.UDSM.BACKEND.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "project_settings")
@Getter
@Setter
@NoArgsConstructor
public class ProjectSetting {
    @Id
    @Column(name = "project_id", length = 100)
    private String projectId;

    @Column(name = "university_name", nullable = false)
    private String universityName;

    @Column(name = "short_name", nullable = false)
    private String shortName;

    @Column(name = "logo_url", length = 1000)
    private String logoUrl;

    @Column(name = "primary_color", length = 20)
    private String primaryColor;

    @Column(name = "font_family", length = 100)
    private String fontFamily;

    @Column(name = "dashboards_json", nullable = false, columnDefinition = "TEXT")
    private String dashboardsJson = "[]";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void createTimestamps() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void updateTimestamp() {
        updatedAt = LocalDateTime.now();
    }
}
