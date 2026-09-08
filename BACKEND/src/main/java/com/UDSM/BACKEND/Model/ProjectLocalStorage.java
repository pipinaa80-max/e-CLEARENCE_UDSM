package com.UDSM.BACKEND.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "project_local_storage")
@Getter
@Setter
@NoArgsConstructor
public class ProjectLocalStorage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false, length = 100)
    private String projectId;

    @Column(name = "storage_key", nullable = false, length = 150)
    private String storageKey;

    @Column(name = "storage_value", nullable = false, columnDefinition = "TEXT")
    private String storageValue;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @PrePersist
    protected void onCreate() {
        importedAt = LocalDateTime.now();
    }
}
