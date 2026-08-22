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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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

    // ✅ ADD THIS: College field (actual database column)
    @Column(name = "college")
    private String college;

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

    // === ADDED FIELDS FOR CLEARANCE REQUEST ===

    @Column(name = "hall")
    private String hall;

    @Column(name = "room_number")
    private String roomNumber;

    @Column(name = "sponsor")
    private String sponsor;

    @Column(name = "photo")
    private String photo;  // Base64 encoded photo

    @Column(name = "graduation_year")
    private String graduationYear;

    @Column(name = "semester")
    private String semester;

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
        if (this.clearanceStatus == null) {
            this.clearanceStatus = ClearanceStatus.PENDING;
        }
        // Sync college with faculty if college is null
        if (this.college == null && this.faculty != null) {
            this.college = this.faculty;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        // Keep college and faculty in sync
        if (this.college != null && this.faculty == null) {
            this.faculty = this.college;
        }
        if (this.faculty != null && this.college == null) {
            this.college = this.faculty;
        }
    }

    // Helper methods
    public String getCollege() {
        return this.college != null ? this.college : this.faculty;
    }

    public void setCollege(String college) {
        this.college = college;
        if (this.faculty == null) {
            this.faculty = college;
        }
    }

    public void setFaculty(String faculty) {
        this.faculty = faculty;
        if (this.college == null) {
            this.college = faculty;
        }
    }

    public void setIsFinalYear(boolean isFinalYear) {
        this.isFinalYear = isFinalYear;
    }

    public void setFinalYear(boolean b) {
        this.isFinalYear = b;
    }
}