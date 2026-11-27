-- ============================================================================
-- UDSM e-Clearance & Transcript MIS — Production Schema & Missing Data Sync
-- ============================================================================
-- File          : deploy/01_production_schema_and_missing_data_sync.sql
-- Target Engine : MySQL 8.0.19+ (InnoDB, utf8mb4, AS new_row syntax)
-- Purpose       : Safe, idempotent ALL-IN-ONE production upgrade & init script:
--                   1. Creates ANY missing tables (all 26 tables via IF NOT EXISTS)
--                   2. Adds ANY missing columns on existing live tables (zero data loss)
--                   3. Refreshes vw_student_profiles view
--                   4. Syncs ALL missing institutional reference data:
--                      - All 20 Colleges & 60+ Departments (incl. UDSE, MRI + 14 depts)
--                      - All 35 canonical Postgraduate programmes (ref_programmes)
--                      - All 4 Default Sponsors, 6 Collection Stations, 11 Halls & 10 Hostels
--                      - All 21 Institutional Office Dashboards (project_settings)
-- Security      : Contains ZERO user accounts and ZERO student rows.
--                 Run deploy/02_postgraduate_staff_seed.sql separately to seed
--                 the 22 Postgraduate staff accounts (2 DPGS + 20 Supervisors).
-- ============================================================================

SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- SECTION 1: CREATE ANY MISSING TABLES (ALL 26 TABLES — NON-DESTRUCTIVE)
-- ============================================================================

-- 1. users
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NULL,
  `first_name` VARCHAR(255) NOT NULL,
  `middle_name` VARCHAR(255) NULL,
  `last_name` VARCHAR(255) NOT NULL,
  `registration_number` VARCHAR(255) NULL,
  `programme` VARCHAR(255) NULL,
  `college` VARCHAR(255) NULL,
  `department` VARCHAR(255) NULL,
  `academic_year` VARCHAR(255) NULL,
  `graduation_year` VARCHAR(255) NULL,
  `semester` VARCHAR(255) NULL,
  `year_of_study` VARCHAR(255) NULL,
  `award` VARCHAR(255) NULL,
  `is_postgraduate` TINYINT(1) NOT NULL DEFAULT 0,
  `phone_number` VARCHAR(255) NULL,
  `hall` VARCHAR(255) NULL,
  `wing` VARCHAR(50) NULL,
  `block` VARCHAR(50) NULL,
  `room_number` VARCHAR(255) NULL,
  `address` VARCHAR(255) NULL,
  `physical_address` VARCHAR(255) NULL,
  `sponsor` VARCHAR(255) NULL,
  `photo` LONGTEXT NULL,
  `role` VARCHAR(50) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_email_verified` TINYINT(1) DEFAULT 0,
  `is_locked` TINYINT(1) DEFAULT 0,
  `lock_reason` VARCHAR(255) NULL,
  `lock_time` DATETIME(6) NULL,
  `reset_token` VARCHAR(255) NULL,
  `reset_token_expiry` DATETIME(6) NULL,
  `verification_token` VARCHAR(255) NULL,
  `verification_token_expiry` DATETIME(6) NULL,
  `last_login` DATETIME(6) NULL,
  `created_at` DATETIME(6) NULL,
  `updated_at` DATETIME(6) NULL,
  `created_by` VARCHAR(255) NULL,
  `updated_by` VARCHAR(255) NULL,
  `project_id` VARCHAR(100) NULL,
  `last_login_ip` VARCHAR(255) NULL,
  `last_login_device` VARCHAR(255) NULL,
  `institutional_domain` VARCHAR(253) NULL,
  `station_code` VARCHAR(50) NULL,
  `station_name` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  KEY `idx_users_username` (`username`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_registration_number` (`registration_number`),
  KEY `idx_users_project_id` (`project_id`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_station_code` (`station_code`),
  KEY `idx_users_role_is_active` (`role`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. students
CREATE TABLE IF NOT EXISTS `students` (
  `id` VARCHAR(255) NOT NULL,
  `registration_number` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL,
  `phone_number` VARCHAR(255) NULL,
  `programme` VARCHAR(255) NULL,
  `faculty` VARCHAR(255) NULL,
  `college` VARCHAR(255) NULL,
  `department` VARCHAR(255) NULL,
  `year_of_study` VARCHAR(255) NULL,
  `academic_year` VARCHAR(255) NULL,
  `date_of_birth` DATE NULL,
  `nationality` VARCHAR(255) NULL,
  `address` VARCHAR(255) NULL,
  `physical_address` VARCHAR(255) NULL,
  `profile_image_url` VARCHAR(255) NULL,
  `hall` VARCHAR(255) NULL,
  `wing` VARCHAR(50) NULL,
  `block` VARCHAR(50) NULL,
  `room_number` VARCHAR(255) NULL,
  `sponsor` VARCHAR(255) NULL,
  `photo` LONGTEXT NULL,
  `graduation_year` VARCHAR(255) NULL,
  `award` VARCHAR(255) NULL,
  `is_postgraduate` TINYINT(1) NOT NULL DEFAULT 0,
  `undergraduate_certificate_url` LONGTEXT NULL,
  `semester` VARCHAR(255) NULL,
  `is_final_year` TINYINT(1) DEFAULT 1,
  `clearance_status` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NULL,
  `updated_at` DATETIME(6) NULL,
  `project_id` VARCHAR(100) NULL,
  `user_id` VARCHAR(255) NULL,
  `certificate_verified` TINYINT(1) DEFAULT 0,
  `certificate_verified_at` DATETIME(6) NULL,
  `digital_signature_hash` VARCHAR(255) NULL,
  `signed_by` VARCHAR(255) NULL,
  `signed_at` DATETIME(6) NULL,
  `dispatch_status` VARCHAR(50) DEFAULT 'Pending Dispatch',
  `dispatched_at` DATETIME(6) NULL,
  `station_code` VARCHAR(50) NULL,
  `station_name` VARCHAR(255) NULL,
  `intake_status` VARCHAR(50) DEFAULT 'Awaiting Intake',
  `station_received_at` DATETIME(6) NULL,
  `station_received_by` VARCHAR(255) NULL,
  `vault_locker_number` VARCHAR(100) NULL,
  `handover_collector_type` VARCHAR(100) NULL,
  `handover_collector_name` VARCHAR(255) NULL,
  `handover_collector_id` VARCHAR(100) NULL,
  `handover_collector_phone` VARCHAR(50) NULL,
  `handover_approved_at` DATETIME(6) NULL,
  `handover_secretary` VARCHAR(255) NULL,
  `handover_receipt_token` VARCHAR(255) NULL,
  `transit_issue_notes` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `students_registration_number_unique` (`registration_number`),
  UNIQUE KEY `students_user_id_unique` (`user_id`),
  KEY `idx_students_registration_number` (`registration_number`),
  KEY `idx_students_user_id` (`user_id`),
  KEY `idx_students_project_id` (`project_id`),
  KEY `idx_students_cert_verified` (`certificate_verified`),
  KEY `idx_students_dispatch_status` (`dispatch_status`),
  KEY `idx_students_station_code` (`station_code`),
  KEY `idx_students_intake_status` (`intake_status`),
  KEY `idx_students_college_dept_status` (`college`, `department`, `clearance_status`),
  KEY `idx_students_station_intake` (`station_code`, `intake_status`),
  CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. clearance_requests
CREATE TABLE IF NOT EXISTS `clearance_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` VARCHAR(255) NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  `current_stage` VARCHAR(255) NULL,
  `current_office` VARCHAR(255) NULL,
  `submitted_at` DATETIME(6) NULL,
  `updated_at` DATETIME(6) NULL,
  `college` VARCHAR(255) NULL,
  `department` VARCHAR(255) NULL,
  `programme` VARCHAR(255) NULL,
  `wing` VARCHAR(50) NULL,
  `block` VARCHAR(50) NULL,
  `address` VARCHAR(255) NULL,
  `physical_address` VARCHAR(255) NULL,
  `award` VARCHAR(255) NULL,
  `is_postgraduate` TINYINT(1) NOT NULL DEFAULT 0,
  `undergraduate_certificate_url` LONGTEXT NULL,
  `project_id` VARCHAR(100) NULL,
  `certificate_verified` TINYINT(1) DEFAULT 0,
  `certificate_verified_at` DATETIME(6) NULL,
  `digital_signature_hash` VARCHAR(255) NULL,
  `signed_by` VARCHAR(255) NULL,
  `signed_at` DATETIME(6) NULL,
  `dispatch_status` VARCHAR(50) DEFAULT 'Pending Dispatch',
  `dispatched_at` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_clearance_requests_student_id` (`student_id`),
  KEY `idx_clearance_requests_project_id` (`project_id`),
  KEY `idx_clearance_college_dept_status` (`college`, `department`, `status`),
  KEY `idx_clearance_student_status` (`student_id`, `status`),
  CONSTRAINT `fk_clearance_requests_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. department_approvals (includes Migration 4 unique constraint)
CREATE TABLE IF NOT EXISTS `department_approvals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `clearance_request_id` BIGINT UNSIGNED NULL,
  `department` VARCHAR(255) NOT NULL,
  `status` VARCHAR(255) NOT NULL,
  `approved_by` VARCHAR(255) NULL,
  `approval_date` DATETIME(6) NULL,
  `comments` VARCHAR(255) NULL,
  `order_number` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dept_approvals_request_dept` (`clearance_request_id`, `department`),
  KEY `idx_department_approvals_request_id` (`clearance_request_id`),
  KEY `idx_approvals_dept_status` (`department`, `status`),
  KEY `idx_approvals_req_dept_status` (`clearance_request_id`, `department`, `status`),
  CONSTRAINT `fk_department_approvals_request` FOREIGN KEY (`clearance_request_id`) REFERENCES `clearance_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. documents
CREATE TABLE IF NOT EXISTS `documents` (
  `id` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `file_size` BIGINT NULL,
  `description` VARCHAR(255) NULL,
  `upload_date` DATETIME(6) NULL,
  `document_category` VARCHAR(255) NULL,
  `is_verified` TINYINT(1) DEFAULT 0,
  `verified_by` VARCHAR(255) NULL,
  `verified_date` DATETIME(6) NULL,
  `verification_comment` VARCHAR(255) NULL,
  `student_id` VARCHAR(255) NOT NULL,
  `project_id` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_documents_student_id` (`student_id`),
  KEY `idx_documents_project_id` (`project_id`),
  CONSTRAINT `fk_documents_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NULL,
  `student_id` VARCHAR(255) NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(255) NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `read_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NULL,
  `link` VARCHAR(255) NULL,
  `project_id` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id` (`user_id`),
  KEY `idx_notifications_student_id` (`student_id`),
  KEY `idx_notifications_project_id` (`project_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. convocation_receipts
CREATE TABLE IF NOT EXISTS `convocation_receipts` (
  `id` VARCHAR(255) NOT NULL,
  `student_id` VARCHAR(255) NOT NULL,
  `control_number` VARCHAR(255) NOT NULL,
  `receipt_number` VARCHAR(255) NOT NULL,
  `payment_date` VARCHAR(255) NULL,
  `file_name` VARCHAR(255) NULL,
  `file_url` VARCHAR(255) NULL,
  `file_type` VARCHAR(255) NULL,
  `file_size` BIGINT NULL,
  `status` VARCHAR(255) NULL,
  `approved_by` VARCHAR(255) NULL,
  `approved_at` DATETIME(6) NULL,
  `comments` VARCHAR(255) NULL,
  `submitted_at` DATETIME(6) NULL,
  `updated_at` DATETIME(6) NULL,
  `project_id` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_convocation_receipts_student_id` (`student_id`),
  KEY `idx_convocation_receipts_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NULL,
  `username` VARCHAR(255) NULL,
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(255) NULL,
  `user_agent` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `created_at` DATETIME(6) NULL,
  `project_id` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_id` (`user_id`),
  KEY `idx_audit_logs_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. student_debt_flags (includes Migration 7 composite index)
CREATE TABLE IF NOT EXISTS `student_debt_flags` (
  `id` VARCHAR(36) NOT NULL,
  `student_id` VARCHAR(36) NOT NULL,
  `registration_number` VARCHAR(50) NOT NULL,
  `student_name` VARCHAR(255) NULL,
  `college` VARCHAR(255) NOT NULL,
  `department` VARCHAR(255) NOT NULL,
  `programme` VARCHAR(255) NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `item_category` VARCHAR(100) DEFAULT 'Equipment / Item Rental',
  `due_date` DATE NULL,
  `reason` TEXT NOT NULL,
  `negotiation_notes` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  `lecturer_id` VARCHAR(36) NOT NULL,
  `lecturer_name` VARCHAR(255) NULL,
  `lecturer_email` VARCHAR(255) NULL,
  `lecturer_phone` VARCHAR(50) NULL,
  `resolution_note` TEXT NULL,
  `resolved_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `project_id` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_student_debt_flags_student_id` (`student_id`),
  KEY `idx_student_debt_flags_scope_status` (`college`, `department`, `status`),
  KEY `idx_student_debt_flags_registration_status` (`registration_number`, `status`),
  KEY `idx_student_debt_flags_lecturer` (`lecturer_id`),
  KEY `idx_debt_flags_student_lecturer` (`student_id`, `lecturer_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. project_settings
CREATE TABLE IF NOT EXISTS `project_settings` (
  `project_id` VARCHAR(100) NOT NULL,
  `university_name` VARCHAR(255) NOT NULL,
  `short_name` VARCHAR(255) NOT NULL,
  `logo_url` VARCHAR(1000) NULL,
  `background_url` TEXT NULL,
  `primary_color` VARCHAR(20) NULL,
  `font_family` VARCHAR(100) NULL,
  `dashboards_json` TEXT NOT NULL,
  `footer_links_json` TEXT NULL,
  `blocked_ips_json` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. project_local_storage
CREATE TABLE IF NOT EXISTS `project_local_storage` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` VARCHAR(100) NOT NULL,
  `storage_key` VARCHAR(150) NOT NULL,
  `storage_value` TEXT NOT NULL,
  `imported_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_project_local_storage_project_key` (`project_id`, `storage_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. colleges
CREATE TABLE IF NOT EXISTS `colleges` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `colleges_code_unique` (`code`),
  KEY `idx_colleges_code` (`code`),
  KEY `idx_colleges_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. departments
CREATE TABLE IF NOT EXISTS `departments` (
  `id` VARCHAR(36) NOT NULL,
  `college_id` VARCHAR(36) NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_college_dept_code` (`college_id`, `code`),
  KEY `idx_departments_college_id` (`college_id`),
  KEY `idx_departments_code` (`code`),
  KEY `idx_departments_is_active` (`is_active`),
  CONSTRAINT `fk_departments_college` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. collection_stations
CREATE TABLE IF NOT EXISTS `collection_stations` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `region` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NULL,
  `address` TEXT NOT NULL,
  `operating_hours` VARCHAR(255) DEFAULT 'Mon - Fri: 08:00 - 16:00',
  `contact_phone` VARCHAR(50) NULL,
  `contact_email` VARCHAR(100) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `collection_stations_code_unique` (`code`),
  KEY `idx_stations_region` (`region`),
  KEY `idx_stations_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. sponsors
CREATE TABLE IF NOT EXISTS `sponsors` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50) NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sponsors_name_unique` (`name`),
  KEY `idx_sponsors_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. ref_colleges
CREATE TABLE IF NOT EXISTS `ref_colleges` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ref_colleges_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. ref_departments
CREATE TABLE IF NOT EXISTS `ref_departments` (
  `id` VARCHAR(36) NOT NULL,
  `college_id` VARCHAR(36) NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ref_dept_college` (`college_id`),
  CONSTRAINT `fk_ref_dept_college` FOREIGN KEY (`college_id`) REFERENCES `ref_colleges` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. ref_programmes
CREATE TABLE IF NOT EXISTS `ref_programmes` (
  `id` VARCHAR(36) NOT NULL,
  `department_id` VARCHAR(36) NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ref_prog_dept` (`department_id`),
  CONSTRAINT `fk_ref_prog_dept` FOREIGN KEY (`department_id`) REFERENCES `ref_departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. ref_halls
CREATE TABLE IF NOT EXISTS `ref_halls` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ref_halls_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. transcript_payment_requests (includes Migration 8 full V36 alignment)
CREATE TABLE IF NOT EXISTS `transcript_payment_requests` (
  `id` VARCHAR(36) NOT NULL,
  `student_id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NULL,
  `active_student_id` VARCHAR(255) NULL,
  `registration_number` VARCHAR(100) NOT NULL,
  `student_name` VARCHAR(255) NOT NULL,
  `college` VARCHAR(255) NULL,
  `department` VARCHAR(255) NULL,
  `programme` VARCHAR(255) NULL,
  `phone_number` VARCHAR(50) NULL,
  `copies` INT NOT NULL DEFAULT 1,
  `amount` DECIMAL(14, 2) DEFAULT 0.00,
  `amount_tzs` INT NOT NULL DEFAULT 15000,
  `control_number` VARCHAR(100) NOT NULL,
  `receipt_number` VARCHAR(100) NULL,
  `receipt_file_name` VARCHAR(255) NULL,
  `receipt_file_url` VARCHAR(500) NULL,
  `receipt_file_type` VARCHAR(100) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  `rejection_reason` VARCHAR(500) NULL,
  `submitted_at` DATETIME(6) NULL,
  `reviewed_at` DATETIME(6) NULL,
  `reviewed_by` VARCHAR(255) NULL,
  `verified_by` VARCHAR(255) NULL,
  `verified_at` DATETIME(6) NULL,
  `comments` TEXT NULL,
  `collection_method` VARCHAR(30) NULL,
  `collection_address` VARCHAR(1000) NULL,
  `posting_region` VARCHAR(100) NULL,
  `posting_ward` VARCHAR(100) NULL,
  `posting_po_box` VARCHAR(100) NULL,
  `contact_phone` VARCHAR(40) NULL,
  `contact_email` VARCHAR(255) NULL,
  `issued_by_director` TINYINT(1) NOT NULL DEFAULT 0,
  `issued_by_director_title` VARCHAR(255) NULL,
  `issued_at` DATETIME(6) NULL,
  `version` BIGINT NOT NULL DEFAULT 0,
  `project_id` VARCHAR(100) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_transcript_payment_control` (`project_id`, `control_number`),
  UNIQUE KEY `uq_transcript_payment_active_student` (`project_id`, `active_student_id`),
  KEY `idx_transcript_student_id` (`student_id`),
  KEY `idx_transcript_status` (`status`),
  KEY `idx_transcript_reg_no` (`registration_number`),
  KEY `idx_transcript_payment_project_status_submitted` (`project_id`, `status`, `submitted_at`),
  KEY `idx_transcript_payment_project_student_submitted` (`project_id`, `user_id`, `submitted_at`),
  CONSTRAINT `fk_transcript_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. awards
CREATE TABLE IF NOT EXISTS `awards` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `sponsor` VARCHAR(255) NULL,
  `college` VARCHAR(255) NULL,
  `department` VARCHAR(255) NULL,
  `prize_amount` DECIMAL(14, 2) DEFAULT 0.00,
  `academic_year` VARCHAR(20) NULL,
  `description` TEXT NULL,
  `recipient_student_id` VARCHAR(255) NULL,
  `recipient_name` VARCHAR(255) NULL,
  `recipient_reg_no` VARCHAR(100) NULL,
  `recipient_gpa` VARCHAR(20) NULL,
  `status` VARCHAR(30) DEFAULT 'ACTIVE',
  `project_id` VARCHAR(100) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_awards_category` (`category`),
  KEY `idx_awards_recipient_student_id` (`recipient_student_id`),
  CONSTRAINT `fk_awards_recipient` FOREIGN KEY (`recipient_student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. hostels
CREATE TABLE IF NOT EXISTS `hostels` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `campus` VARCHAR(150) DEFAULT 'Main Campus (Mlimani)',
  `blocks_json` TEXT NULL,
  `wings_json` TEXT NULL,
  `total_rooms` INT DEFAULT 0,
  `capacity` INT DEFAULT 0,
  `warden_user_id` VARCHAR(255) NULL,
  `warden_name` VARCHAR(255) NULL,
  `contact_phone` VARCHAR(50) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `project_id` VARCHAR(100) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `hostels_code_unique` (`code`),
  KEY `idx_hostels_code` (`code`),
  KEY `idx_hostels_is_active` (`is_active`),
  KEY `fk_hostels_warden` (`warden_user_id`),
  CONSTRAINT `fk_hostels_warden` FOREIGN KEY (`warden_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. revoked_tokens (Migration 2)
CREATE TABLE IF NOT EXISTS `revoked_tokens` (
  `id` VARCHAR(255) NOT NULL,
  `jti` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NULL,
  `token_type` VARCHAR(50) NOT NULL DEFAULT 'access',
  `expires_at` DATETIME(6) NOT NULL,
  `reason` VARCHAR(100) NULL,
  `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `revoked_tokens_jti_unique` (`jti`),
  KEY `revoked_tokens_jti_index` (`jti`),
  KEY `revoked_tokens_user_id_index` (`user_id`),
  KEY `revoked_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. refresh_tokens (Migration 2 + Migration 3 session_id)
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `jti` VARCHAR(255) NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL,
  `family_id` VARCHAR(255) NOT NULL,
  `session_id` VARCHAR(255) NULL,
  `is_revoked` TINYINT(1) DEFAULT 0,
  `revoked_at` DATETIME(6) NULL,
  `replaced_by_jti` VARCHAR(255) NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `refresh_tokens_jti_unique` (`jti`),
  UNIQUE KEY `refresh_tokens_token_hash_unique` (`token_hash`),
  KEY `refresh_tokens_user_id_index` (`user_id`),
  KEY `refresh_tokens_jti_index` (`jti`),
  KEY `refresh_tokens_token_hash_index` (`token_hash`),
  KEY `refresh_tokens_family_id_index` (`family_id`),
  KEY `refresh_tokens_session_id_index` (`session_id`),
  KEY `refresh_tokens_is_revoked_index` (`is_revoked`),
  KEY `refresh_tokens_expires_at_index` (`expires_at`),
  CONSTRAINT `refresh_tokens_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. user_sessions (Migration 3)
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `device_info` VARCHAR(255) NULL,
  `ip_address` VARCHAR(100) NULL,
  `is_revoked` TINYINT(1) DEFAULT 0,
  `revoked_at` DATETIME(6) NULL,
  `revocation_reason` VARCHAR(100) NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `user_sessions_user_id_index` (`user_id`),
  KEY `user_sessions_is_revoked_index` (`is_revoked`),
  KEY `user_sessions_expires_at_index` (`expires_at`),
  CONSTRAINT `user_sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. clearance_certificates (Migration 5 + Migration 6 unique clearance_request_id)
CREATE TABLE IF NOT EXISTS `clearance_certificates` (
  `id` VARCHAR(255) NOT NULL,
  `certificate_number` VARCHAR(100) NOT NULL,
  `clearance_request_id` BIGINT UNSIGNED NOT NULL,
  `student_id` VARCHAR(255) NOT NULL,
  `verification_code` VARCHAR(64) NOT NULL,
  `digital_signature_hash` VARCHAR(255) NOT NULL,
  `issued_at` DATETIME(6) NOT NULL,
  `issued_by` VARCHAR(255) NOT NULL,
  `is_revoked` TINYINT(1) DEFAULT 0,
  `revoked_at` DATETIME(6) NULL,
  `revoked_by` VARCHAR(255) NULL,
  `revocation_reason` VARCHAR(255) NULL,
  `certificate_data` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clearance_certificates_certificate_number_unique` (`certificate_number`),
  UNIQUE KEY `clearance_certificates_verification_code_unique` (`verification_code`),
  UNIQUE KEY `clearance_certificates_request_id_unique` (`clearance_request_id`),
  KEY `idx_cert_request_id` (`clearance_request_id`),
  KEY `idx_cert_student_id` (`student_id`),
  KEY `idx_cert_verification_code` (`verification_code`),
  KEY `idx_cert_number` (`certificate_number`),
  CONSTRAINT `fk_cert_clearance_request` FOREIGN KEY (`clearance_request_id`) REFERENCES `clearance_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cert_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SECTION 1B: ADD ANY MISSING COLUMNS ON EXISTING LIVE TABLES (ZERO DATA LOSS)
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `udsm_add_col_if_missing`$$
CREATE PROCEDURE `udsm_add_col_if_missing`(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- Postgraduate, Award & Regional Station columns on users
CALL `udsm_add_col_if_missing`('users', 'award', 'VARCHAR(255) NULL AFTER `year_of_study`');
CALL `udsm_add_col_if_missing`('users', 'is_postgraduate', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `award`');
CALL `udsm_add_col_if_missing`('users', 'station_code', 'VARCHAR(64) NULL AFTER `is_postgraduate`');
CALL `udsm_add_col_if_missing`('users', 'station_name', 'VARCHAR(255) NULL AFTER `station_code`');

-- Postgraduate & Undergraduate Certificate columns on students
CALL `udsm_add_col_if_missing`('students', 'award', 'VARCHAR(255) NULL AFTER `graduation_year`');
CALL `udsm_add_col_if_missing`('students', 'is_postgraduate', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `award`');
CALL `udsm_add_col_if_missing`('students', 'undergraduate_certificate_url', 'LONGTEXT NULL AFTER `is_postgraduate`');

-- Postgraduate & Undergraduate Certificate columns on clearance_requests
CALL `udsm_add_col_if_missing`('clearance_requests', 'award', 'VARCHAR(255) NULL AFTER `physical_address`');
CALL `udsm_add_col_if_missing`('clearance_requests', 'is_postgraduate', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `award`');
CALL `udsm_add_col_if_missing`('clearance_requests', 'undergraduate_certificate_url', 'LONGTEXT NULL AFTER `is_postgraduate`');

-- Director Issue & Forward persistence columns on transcript_payment_requests
CALL `udsm_add_col_if_missing`('transcript_payment_requests', 'issued_by_director', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `contact_email`');
CALL `udsm_add_col_if_missing`('transcript_payment_requests', 'issued_by_director_title', 'VARCHAR(255) NULL AFTER `issued_by_director`');
CALL `udsm_add_col_if_missing`('transcript_payment_requests', 'issued_at', 'DATETIME(6) NULL AFTER `issued_by_director_title`');

DROP PROCEDURE IF EXISTS `udsm_add_col_if_missing`;

-- ============================================================================
-- SECTION 2: VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW `vw_student_profiles` AS
SELECT
  u.id AS user_id,
  u.username,
  u.email,
  u.role,
  u.first_name,
  u.middle_name,
  u.last_name,
  u.full_name,
  u.phone_number,
  u.is_active,
  u.is_email_verified,
  u.project_id,
  COALESCE(s.award, u.award) AS award,
  COALESCE(s.is_postgraduate, u.is_postgraduate, 0) AS is_postgraduate,
  s.undergraduate_certificate_url,
  s.id AS student_id,
  s.registration_number,
  s.programme,
  s.college,
  s.department,
  s.academic_year,
  s.graduation_year,
  s.semester,
  s.year_of_study,
  s.hall,
  s.wing,
  s.block,
  s.room_number,
  s.sponsor,
  s.clearance_status
FROM `users` u
LEFT JOIN `students` s ON s.user_id = u.id;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SECTION 3: INSTITUTIONAL REFERENCE DATA (NO USERS / NO PASSWORDS)
-- Mirrors src/database/seeds/01_reference_data.js
-- ============================================================================

-- 3.1 Colleges (20 UDSM Colleges, Schools & Institutes)
INSERT INTO `colleges` (`id`, `code`, `name`, `description`, `is_active`) VALUES
  ('col-coict', 'CoICT', 'College of Information and Communication Technologies', 'Kijitonyama Campus - Computing, Software, and Telecommunications', 1),
  ('col-coet',  'CoET',  'College of Engineering and Technology', 'Main Campus - Engineering, Architecture and Technology', 1),
  ('col-conas', 'CoNAS', 'College of Natural and Applied Sciences', 'Main Campus - Natural, Physical and Biological Sciences', 1),
  ('col-cohu',  'CoHU',  'College of Humanities', 'Main Campus - Literature, History, Languages and Arts', 1),
  ('col-coss',  'CoSS',  'College of Social Sciences', 'Main Campus - Economics, Sociology, Statistics and Political Science', 1),
  ('col-udbs',  'UDBS',  'University of Dar es Salaam Business School', 'Main Campus - Accounting, Finance, Marketing and Management', 1),
  ('col-soed',  'SoED',  'School of Education', 'Main Campus - Educational Foundations and Curriculum', 1),
  ('col-udsol', 'UDSoL', 'University of Dar es Salaam School of Law', 'Main Campus - Legal Studies, Public and Private Law', 1),
  ('col-udse',  'UDSE',  'University of Dar es Salaam School of Economics', 'Main Campus - Economics and Applied Statistics', 1),
  ('col-somg',  'SoMG',  'College of Mines and Geosciences', 'Main Campus - Geosciences, Mining and Petroleum Engineering', 1),
  ('col-sjmc',  'SJMC',  'School of Journalism and Mass Communication', 'Mikocheni Campus - Journalism, Media and PR', 1),
  ('col-ids',   'IDS',   'Institute of Development Studies', 'Main Campus - Development Studies and Research', 1),
  ('col-coaf',  'CoAF',  'College of Agricultural Sciences and Food Technology', 'Main Campus - Agriculture, Food and Bio-resources', 1),
  ('col-mchas', 'MCHAS', 'Mbeya College of Health and Allied Sciences', 'Mbeya Campus - Health, Medicine and Clinical Sciences', 1),
  ('col-mri',   'MRI',   'Mineral Resources Institute', 'Dodoma / Affiliated Institute - Mining, Geology and Surveying', 1),
  ('col-duce',  'DUCE',  'Dar es Salaam University College of Education', 'Chang''ombe Campus - Constituent College of Education', 1),
  ('col-muce',  'MUCE',  'Mkwawa University College of Education', 'Iringa Campus - Constituent College of Education', 1),
  ('col-soaf',  'SoAF',  'School of Aquatic Sciences and Fisheries Technology', 'Kunduchi Campus - Marine and Aquatic Sciences', 1),
  ('col-iks',   'IKS',   'Institute of Kiswahili Studies', 'Main Campus - Kiswahili Language, Literature and Linguistics', 1),
  ('col-ims',   'IMS',   'Institute of Marine Sciences', 'Zanzibar Campus - Oceanography and Marine Resources', 1)
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`,
  `description` = `new_row`.`description`,
  `is_active` = `new_row`.`is_active`;

-- 3.2 Departments (61 Departments across all UDSM Colleges, Schools & Institutes)
INSERT INTO `departments` (`id`, `college_id`, `code`, `name`, `description`, `is_active`) VALUES
  -- CoICT
  ('dept-coict-cse', 'col-coict', 'CSE', 'Department of Computer Science and Engineering', 'Software Engineering, Computer Science, AI and Computer Networks', 1),
  ('dept-coict-ete', 'col-coict', 'ETE', 'Department of Electronics and Telecommunications Engineering', 'Telecommunications, Signal Processing and Electronics', 1),
  ('dept-coict-is',  'col-coict', 'IS',  'Department of Information Systems', 'Information Systems, Informatics and Data Management', 1),
  -- CoET
  ('dept-coet-cpe',  'col-coet',  'CPE', 'Chemical and Process Engineering', 'Chemical Engineering and Petrochemical Processes', 1),
  ('dept-coet-ee',   'col-coet',  'EE',  'Electrical Engineering', 'Power Systems, Energy and Electrical Technology', 1),
  ('dept-coet-mie',  'col-coet',  'MIE', 'Mechanical and Industrial Engineering', 'Mechanical, Industrial and Textile Engineering', 1),
  ('dept-coet-sce',  'col-coet',  'SCE', 'Structural and Construction Engineering', 'Civil Engineering, Architecture and Quantity Surveying', 1),
  ('dept-coet-tge',  'col-coet',  'TGE', 'Transportation and Geotechnical Engineering', 'Geomatics and Transportation Engineering', 1),
  ('dept-coet-wre',  'col-coet',  'WRE', 'Water Resources Engineering', 'Hydrology and Environmental Engineering', 1),
  -- CoNAS
  ('dept-conas-bot', 'col-conas', 'BOT', 'Botany', 'Plant Biology, Ecology and Biodiversity', 1),
  ('dept-conas-chm', 'col-conas', 'CHM', 'Chemistry', 'Organic, Inorganic, Physical and Analytical Chemistry', 1),
  ('dept-conas-geo', 'col-conas', 'GEO', 'Geology', 'Geosciences and Earth Systems', 1),
  ('dept-conas-mth', 'col-conas', 'MTH', 'Mathematics', 'Pure and Applied Mathematics, Statistics', 1),
  ('dept-conas-mbb', 'col-conas', 'MBB', 'Molecular Biology and Biotechnology', 'Genetics, Biochemistry and Biotechnology', 1),
  ('dept-conas-nas', 'col-conas', 'NAS', 'Natural and Applied Sciences', 'Interdisciplinary Natural and Applied Sciences with Education', 1),
  ('dept-conas-phy', 'col-conas', 'PHY', 'Physics', 'Applied Physics, Materials and Renewable Energy', 1),
  ('dept-conas-zwc', 'col-conas', 'ZWC', 'Zoology and Wildlife Conservation', 'Animal Biology, Ecology and Wildlife Management', 1),
  -- CoHU
  ('dept-cohu-ash',  'col-cohu',  'ASH', 'Archaeology and Heritage Studies', 'Archaeological Research and Cultural Heritage', 1),
  ('dept-cohu-ca',   'col-cohu',  'CA',  'Creative Arts', 'Fine Arts, Music, Theatre and Design', 1),
  ('dept-cohu-fll',  'col-cohu',  'FLL', 'Foreign Languages and Linguistics', 'Linguistics, French, Chinese and Literature', 1),
  ('dept-cohu-his',  'col-cohu',  'HIS', 'History', 'African, Regional and Global History', 1),
  ('dept-cohu-prs',  'col-cohu',  'PRS', 'Philosophy and Religious Studies', 'Ethics, Philosophy and Comparative Religion', 1),
  ('dept-cohu-lcm',  'col-cohu',  'LCM', 'Literature, Communication and Media', 'Literary Studies and Publishing', 1),
  -- CoSS
  ('dept-coss-econ', 'col-coss',  'ECON',   'Economics', 'Applied, Development and Financial Economics', 1),
  ('dept-coss-geo',  'col-coss',  'GEO-SS', 'Geography', 'Human Geography, GIS and Environmental Management', 1),
  ('dept-coss-is',   'col-coss',  'IS-SS',  'Information Studies', 'Library and Information Studies', 1),
  ('dept-coss-pspa', 'col-coss',  'PSPA',   'Political Science and Public Administration', 'Governance, Policy and Public Administration', 1),
  ('dept-coss-ss',   'col-coss',  'SS',     'Social Sciences', 'Interdisciplinary Social Sciences and Arts with Education', 1),
  ('dept-coss-soc',  'col-coss',  'SOC',    'Sociology', 'Social Development and Anthropology', 1),
  ('dept-coss-stat', 'col-coss',  'STAT',   'Statistics', 'Official Statistics and Data Analytics', 1),
  -- UDBS
  ('dept-udbs-acct', 'col-udbs',  'ACCT', 'Accounting', 'Financial, Forensic and Management Accounting', 1),
  ('dept-udbs-fin',  'col-udbs',  'FIN',  'Finance', 'Banking, Corporate Finance and Investment', 1),
  ('dept-udbs-gm',   'col-udbs',  'GM',   'General Management', 'Human Resource and Strategic Management', 1),
  ('dept-udbs-mkt',  'col-udbs',  'MKT',  'Marketing', 'Commerce, Supply Chain and Marketing', 1),
  -- SoED
  ('dept-soed-efml', 'col-soed',  'EFML', 'Educational Foundations, Management and Lifelong Learning', 'Policy, Leadership and Foundations', 1),
  ('dept-soed-epcs', 'col-soed',  'EPCS', 'Educational Psychology and Curriculum Studies', 'Psychology, Special Needs and Curriculum', 1),
  ('dept-soed-pess', 'col-soed',  'PESS', 'Physical Education and Sport Sciences', 'Sports Science and Physical Education', 1),
  -- UDSoL
  ('dept-udsol-publ',  'col-udsol', 'PUB-L',  'Public Law', 'Constitutional, Human Rights and Administrative Law', 1),
  ('dept-udsol-privl', 'col-udsol', 'PRIV-L', 'Private Law', 'Commercial, Contract and Family Law', 1),
  ('dept-udsol-econl', 'col-udsol', 'ECON-L', 'Economic Law', 'Trade, Tax and Intellectual Property Law', 1),
  -- UDSE
  ('dept-udse-econ', 'col-udse',  'ECON-SE', 'Economics', 'Economics and Applied Statistics', 1),
  -- SoMG
  ('dept-somg-gs',   'col-somg',  'GS',   'Geosciences', 'Geology, Geophysics and Earth Sciences', 1),
  ('dept-somg-mmpe', 'col-somg',  'MMPE', 'Mining and Mineral Processing Engineering', 'Mining, Mineral Processing and Metallurgy', 1),
  ('dept-somg-pse',  'col-somg',  'PSE',  'Petroleum Science and Engineering', 'Oil, Gas and Petroleum Geosciences', 1),
  -- CoAF
  ('dept-coaf-aeb',  'col-coaf',  'AEB',  'Agricultural Economics and Business', 'Agribusiness and Resource Economics', 1),
  ('dept-coaf-ae',   'col-coaf',  'AE',   'Agricultural Engineering', 'Farm Mechanization and Irrigation Engineering', 1),
  ('dept-coaf-csbt', 'col-coaf',  'CSBT', 'Crop Sciences and Beekeeping Technology', 'Agronomy and Apiculture', 1),
  ('dept-coaf-fst',  'col-coaf',  'FST',  'Food Science and Technology', 'Food Processing, Nutrition and Quality Control', 1),
  -- MCHAS
  ('dept-mchas-med',   'col-mchas', 'MED',   'Clinical Medicine', 'Internal Medicine and Clinical Practice', 1),
  ('dept-mchas-pharm', 'col-mchas', 'PHARM', 'Pharmacy', 'Pharmaceutical Sciences and Therapeutics', 1),
  ('dept-mchas-nurs',  'col-mchas', 'NURS',  'Nursing', 'Nursing Sciences and Community Health', 1),
  -- IDS, IKS, IMS, SJMC, SoAF
  ('dept-ids-ds',    'col-ids',   'DS',   'Development Studies', 'Development Studies and Research', 1),
  ('dept-iks-kis',   'col-iks',   'KIS',  'Kiswahili', 'Kiswahili Language, Literature and Linguistics', 1),
  ('dept-ims-ms',    'col-ims',   'MS',   'Marine Sciences', 'Oceanography and Marine Sciences', 1),
  ('dept-sjmc-jmc',  'col-sjmc',  'JMC',  'Journalism and Mass Communication', 'Journalism, Mass Communication and Public Relations', 1),
  ('dept-soaf-asft', 'col-soaf',  'ASFT', 'Aquatic Sciences and Fisheries Technology', 'Aquatic Sciences and Fisheries Technology', 1),
  -- MRI (Mineral Resources Institute)
  ('dept-mri-eem',   'col-mri',   'EEM',  'Environmental Engineering and Management', 'Environmental Engineering and Management in Mines', 1),
  ('dept-mri-gme',   'col-mri',   'GME',  'Geology and Mineral Exploration', 'Geology and Mineral Exploration', 1),
  ('dept-mri-lms',   'col-mri',   'LMS',  'Land and Mine Surveying', 'Land and Mine Surveying', 1),
  ('dept-mri-me',    'col-mri',   'ME',   'Mining Engineering', 'Mining Engineering and Mineral Extraction', 1),
  ('dept-mri-pge',   'col-mri',   'PGE',  'Petroleum Geosciences and Exploration', 'Petroleum Geosciences and Exploration', 1)
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`,
  `description` = `new_row`.`description`,
  `is_active` = `new_row`.`is_active`;

-- 3.3 Collection Stations (6 Stations)
INSERT INTO `collection_stations` (`id`, `code`, `name`, `region`, `district`, `address`, `operating_hours`, `contact_phone`, `contact_email`, `is_active`) VALUES
  ('stn-udsm-main',    'UDSM-MAIN',  'UDSM Main Campus - DUS Central Station',   'Dar es Salaam', 'Ubunifu / Kinondoni', 'DUS Building Room 102, Main Campus',                       'Mon - Fri: 08:00 - 16:00', '+255 22 2410500', 'dus.collection@udsm.ac.tz',   1),
  ('stn-coict-kijito', 'COICT-HUB',  'CoICT Kijitonyama Dispatch Center',        'Dar es Salaam', 'Kijitonyama',         'CoICT Block A Ground Floor, Kijitonyama Campus',            'Mon - Fri: 08:00 - 16:00', '+255 22 2700010', 'coict.collection@udsm.ac.tz', 1),
  ('stn-arusha-hub',   'ARUSHA-HUB', 'UDSM Arusha Regional Collection Station',  'Arusha',        'Arusha Urban',        'UDSM Extension Center, Clocktower Street',                  'Mon - Fri: 08:30 - 16:30', '+255 27 2548890', 'arusha.center@udsm.ac.tz',    1),
  ('stn-mwanza-hub',   'MWANZA-HUB', 'UDSM Mwanza Regional Collection Station',  'Mwanza',        'Nyamagana',           'UDSM Lake Zone Center, Station Road',                       'Mon - Fri: 08:30 - 16:30', '+255 28 2500411', 'mwanza.center@udsm.ac.tz',    1),
  ('stn-mbeya-hub',    'MBEYA-HUB',  'UDSM Mbeya Regional Collection Station',   'Mbeya',         'Mbeya City',          'UDSM Southern Highlands Bureau, Posta Street',              'Mon - Fri: 08:30 - 16:30', '+255 25 2502200', 'mbeya.center@udsm.ac.tz',     1),
  ('stn-dodoma-hub',   'DODOMA-HUB', 'UDSM Capital Dodoma Collection Bureau',    'Dodoma',        'Dodoma Urban',        'Government City Sub-Bureau, Block B',                       'Mon - Fri: 08:00 - 16:00', '+255 26 2321100', 'dodoma.center@udsm.ac.tz',    1)
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`,
  `address` = `new_row`.`address`,
  `operating_hours` = `new_row`.`operating_hours`,
  `contact_phone` = `new_row`.`contact_phone`,
  `contact_email` = `new_row`.`contact_email`,
  `is_active` = `new_row`.`is_active`;

-- 3.4 Sponsors (4 Default Sponsors)
INSERT INTO `sponsors` (`id`, `name`, `code`, `description`, `is_active`) VALUES
  ('spn-heslb',    'HESLB',                 'HESLB',    'Higher Education Students'' Loans Board',      1),
  ('spn-karimjee', 'Karimjee Scholarships', 'KARIMJEE', 'Karimjee Jivanjee Foundation Scholarship',     1),
  ('spn-mo',       'MO scholarship',        'MO',       'Mo Dewji Foundation Scholarship',              1),
  ('spn-private',  'PRIVATE',               'PRIVATE',  'Self-sponsored / Private funding',             1)
AS `new_row`
ON DUPLICATE KEY UPDATE
  `code` = `new_row`.`code`,
  `description` = `new_row`.`description`,
  `is_active` = `new_row`.`is_active`;

-- 3.5 Reference Lookup Tables (ref_colleges, ref_departments, ref_halls)
INSERT INTO `ref_colleges` (`id`, `code`, `name`) VALUES
  ('col-coict', 'CoICT', 'College of Information and Communication Technologies'),
  ('col-coet',  'CoET',  'College of Engineering and Technology'),
  ('col-conas', 'CoNAS', 'College of Natural and Applied Sciences'),
  ('col-cohu',  'CoHU',  'College of Humanities'),
  ('col-coss',  'CoSS',  'College of Social Sciences'),
  ('col-udbs',  'UDBS',  'University of Dar es Salaam Business School'),
  ('col-soed',  'SoED',  'School of Education'),
  ('col-udsol', 'UDSoL', 'University of Dar es Salaam School of Law'),
  ('col-udse',  'UDSE',  'University of Dar es Salaam School of Economics'),
  ('col-somg',  'SoMG',  'College of Mines and Geosciences'),
  ('col-sjmc',  'SJMC',  'School of Journalism and Mass Communication'),
  ('col-ids',   'IDS',   'Institute of Development Studies'),
  ('col-coaf',  'CoAF',  'College of Agricultural Sciences and Food Technology'),
  ('col-mchas', 'MCHAS', 'Mbeya College of Health and Allied Sciences'),
  ('col-mri',   'MRI',   'Mineral Resources Institute'),
  ('col-duce',  'DUCE',  'Dar es Salaam University College of Education'),
  ('col-muce',  'MUCE',  'Mkwawa University College of Education'),
  ('col-soaf',  'SoAF',  'School of Aquatic Sciences and Fisheries Technology'),
  ('col-iks',   'IKS',   'Institute of Kiswahili Studies'),
  ('col-ims',   'IMS',   'Institute of Marine Sciences')
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`;

INSERT INTO `ref_departments` (`id`, `college_id`, `code`, `name`) VALUES
  ('dept-coict-cse',   'col-coict', 'CSE',    'Department of Computer Science and Engineering'),
  ('dept-coict-ete',   'col-coict', 'ETE',    'Department of Electronics and Telecommunications Engineering'),
  ('dept-coict-is',    'col-coict', 'IS',     'Department of Information Systems'),
  ('dept-coet-cpe',    'col-coet',  'CPE',    'Chemical and Process Engineering'),
  ('dept-coet-ee',     'col-coet',  'EE',     'Electrical Engineering'),
  ('dept-coet-mie',    'col-coet',  'MIE',    'Mechanical and Industrial Engineering'),
  ('dept-coet-sce',    'col-coet',  'SCE',    'Structural and Construction Engineering'),
  ('dept-coet-tge',    'col-coet',  'TGE',    'Transportation and Geotechnical Engineering'),
  ('dept-coet-wre',    'col-coet',  'WRE',    'Water Resources Engineering'),
  ('dept-conas-bot',   'col-conas', 'BOT',    'Botany'),
  ('dept-conas-chm',   'col-conas', 'CHM',    'Chemistry'),
  ('dept-conas-geo',   'col-conas', 'GEO',    'Geology'),
  ('dept-conas-mth',   'col-conas', 'MTH',    'Mathematics'),
  ('dept-conas-mbb',   'col-conas', 'MBB',    'Molecular Biology and Biotechnology'),
  ('dept-conas-nas',   'col-conas', 'NAS',    'Natural and Applied Sciences'),
  ('dept-conas-phy',   'col-conas', 'PHY',    'Physics'),
  ('dept-conas-zwc',   'col-conas', 'ZWC',    'Zoology and Wildlife Conservation'),
  ('dept-cohu-ash',    'col-cohu',  'ASH',    'Archaeology and Heritage Studies'),
  ('dept-cohu-ca',     'col-cohu',  'CA',     'Creative Arts'),
  ('dept-cohu-fll',    'col-cohu',  'FLL',    'Foreign Languages and Linguistics'),
  ('dept-cohu-his',    'col-cohu',  'HIS',    'History'),
  ('dept-cohu-prs',    'col-cohu',  'PRS',    'Philosophy and Religious Studies'),
  ('dept-cohu-lcm',    'col-cohu',  'LCM',    'Literature, Communication and Media'),
  ('dept-coss-econ',   'col-coss',  'ECON',   'Economics'),
  ('dept-coss-geo',    'col-coss',  'GEO-SS', 'Geography'),
  ('dept-coss-is',     'col-coss',  'IS-SS',  'Information Studies'),
  ('dept-coss-pspa',   'col-coss',  'PSPA',   'Political Science and Public Administration'),
  ('dept-coss-ss',     'col-coss',  'SS',     'Social Sciences'),
  ('dept-coss-soc',    'col-coss',  'SOC',    'Sociology'),
  ('dept-coss-stat',   'col-coss',  'STAT',   'Statistics'),
  ('dept-udbs-acct',   'col-udbs',  'ACCT',   'Accounting'),
  ('dept-udbs-fin',    'col-udbs',  'FIN',    'Finance'),
  ('dept-udbs-gm',     'col-udbs',  'GM',     'General Management'),
  ('dept-udbs-mkt',    'col-udbs',  'MKT',    'Marketing'),
  ('dept-soed-efml',   'col-soed',  'EFML',   'Educational Foundations, Management and Lifelong Learning'),
  ('dept-soed-epcs',   'col-soed',  'EPCS',   'Educational Psychology and Curriculum Studies'),
  ('dept-soed-pess',   'col-soed',  'PESS',   'Physical Education and Sport Sciences'),
  ('dept-udsol-publ',  'col-udsol', 'PUB-L',  'Public Law'),
  ('dept-udsol-privl', 'col-udsol', 'PRIV-L', 'Private Law'),
  ('dept-udsol-econl', 'col-udsol', 'ECON-L', 'Economic Law'),
  ('dept-udse-econ',   'col-udse',  'ECON-SE','Economics'),
  ('dept-somg-gs',     'col-somg',  'GS',     'Geosciences'),
  ('dept-somg-mmpe',   'col-somg',  'MMPE',   'Mining and Mineral Processing Engineering'),
  ('dept-somg-pse',    'col-somg',  'PSE',    'Petroleum Science and Engineering'),
  ('dept-coaf-aeb',    'col-coaf',  'AEB',    'Agricultural Economics and Business'),
  ('dept-coaf-ae',     'col-coaf',  'AE',     'Agricultural Engineering'),
  ('dept-coaf-csbt',   'col-coaf',  'CSBT',   'Crop Sciences and Beekeeping Technology'),
  ('dept-coaf-fst',    'col-coaf',  'FST',    'Food Science and Technology'),
  ('dept-mchas-med',   'col-mchas', 'MED',    'Clinical Medicine'),
  ('dept-mchas-pharm', 'col-mchas', 'PHARM',  'Pharmacy'),
  ('dept-mchas-nurs',  'col-mchas', 'NURS',   'Nursing'),
  ('dept-ids-ds',      'col-ids',   'DS',     'Development Studies'),
  ('dept-iks-kis',     'col-iks',   'KIS',    'Kiswahili'),
  ('dept-ims-ms',      'col-ims',   'MS',     'Marine Sciences'),
  ('dept-sjmc-jmc',    'col-sjmc',  'JMC',    'Journalism and Mass Communication'),
  ('dept-soaf-asft',   'col-soaf',  'ASFT',   'Aquatic Sciences and Fisheries Technology'),
  ('dept-mri-eem',     'col-mri',   'EEM',    'Environmental Engineering and Management'),
  ('dept-mri-gme',     'col-mri',   'GME',    'Geology and Mineral Exploration'),
  ('dept-mri-lms',     'col-mri',   'LMS',    'Land and Mine Surveying'),
  ('dept-mri-me',      'col-mri',   'ME',     'Mining Engineering'),
  ('dept-mri-pge',     'col-mri',   'PGE',    'Petroleum Geosciences and Exploration')
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`,
  `code` = `new_row`.`code`,
  `college_id` = `new_row`.`college_id`;

INSERT INTO `ref_halls` (`id`, `name`) VALUES
  ('hall-1',         'Hall 1'),
  ('hall-2',         'Hall 2'),
  ('hall-3',         'Hall 3'),
  ('hall-4',         'Hall 4'),
  ('hall-5',         'Hall 5'),
  ('hall-6',         'Hall 6'),
  ('hall-7',         'Hall 7'),
  ('hall-mabibo',    'Mabibo Hostel'),
  ('hall-kurasini',  'Kurasini Hostel'),
  ('hall-magufuli',  'Magufuli Hostel'),
  ('hall-offcampus', 'Off Campus')
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`;

INSERT INTO `hostels` (`id`, `code`, `name`, `campus`, `blocks_json`, `wings_json`, `total_rooms`, `capacity`, `warden_name`, `contact_phone`, `is_active`) VALUES
  ('hst-hall-1',   'HALL-1',   'Hall 1',          'Main Campus (Mlimani)', '["Block A","Block B"]',                                        '["East Wing","West Wing"]',   180, 360,  'Hall 1 Warden Office',   '+255 22 2410500', 1),
  ('hst-hall-2',   'HALL-2',   'Hall 2',          'Main Campus (Mlimani)', '["Block A","Block B"]',                                        '["East Wing","West Wing"]',   200, 400,  'Hall 2 Warden Office',   '+255 22 2410500', 1),
  ('hst-hall-3',   'HALL-3',   'Hall 3',          'Main Campus (Mlimani)', '["Block A","Block B"]',                                        '["North Wing","South Wing"]', 160, 320,  'Hall 3 Warden Office',   '+255 22 2410500', 1),
  ('hst-hall-4',   'HALL-4',   'Hall 4',          'Main Campus (Mlimani)', '["Block A","Block B"]',                                        '["East Wing","West Wing"]',   160, 320,  'Hall 4 Warden Office',   '+255 22 2410500', 1),
  ('hst-hall-5',   'HALL-5',   'Hall 5',          'Main Campus (Mlimani)', '["Block A","Block B"]',                                        '["North Wing","South Wing"]', 220, 440,  'Hall 5 Warden Office',   '+255 22 2410500', 1),
  ('hst-hall-6',   'HALL-6',   'Hall 6',          'Main Campus (Mlimani)', '["Block A","Block B"]',                                        '["East Wing","West Wing"]',   180, 360,  'Hall 6 Warden Office',   '+255 22 2410500', 1),
  ('hst-hall-7',   'HALL-7',   'Hall 7',          'Main Campus (Mlimani)', '["Block A","Block B"]',                                        '["East Wing","West Wing"]',   180, 360,  'Hall 7 Warden Office',   '+255 22 2410500', 1),
  ('hst-mabibo',   'MABIBO',   'Mabibo Hostel',   'Mabibo Campus',         '["Block A","Block B","Block C","Block D","Block E","Block F"]', '["Wing 1","Wing 2"]',        960, 3840, 'Mabibo Hostel Warden',   '+255 22 2410500', 1),
  ('hst-kurasini', 'KURASINI', 'Kurasini Hostel', 'Kurasini Campus',       '["Block A","Block B"]',                                        '["Wing 1","Wing 2"]',        140, 280,  'Kurasini Hostel Warden', '+255 22 2410500', 1),
  ('hst-magufuli', 'MAGUFULI', 'Magufuli Hostel', 'Main Campus (Mlimani)', '["Block A","Block B","Block C","Block D","Block E"]',          '["Wing 1","Wing 2"]',        960, 3840, 'Magufuli Hostel Warden', '+255 22 2410500', 1)
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`,
  `campus` = `new_row`.`campus`,
  `blocks_json` = `new_row`.`blocks_json`,
  `wings_json` = `new_row`.`wings_json`,
  `total_rooms` = `new_row`.`total_rooms`,
  `capacity` = `new_row`.`capacity`,
  `is_active` = `new_row`.`is_active`,
  `updated_at` = NOW(6);

-- 3.5b Reference Postgraduate Programmes Catalog (ref_programmes)
INSERT INTO `ref_programmes` (`id`, `department_id`, `code`, `name`) VALUES
  ('prog-pg-coict-msc-cs',   'dept-coict-cse',  'MSC-CS',   'Master of Science in Computer Science'),
  ('prog-pg-coict-msc-hi',   'dept-coict-is',   'MSC-HI',   'Master of Science in Health Informatics'),
  ('prog-pg-coict-msc-tel',  'dept-coict-ete',  'MSC-TEL',  'Master of Science in Telecommunications Engineering'),
  ('prog-pg-coict-phd-cse',  'dept-coict-cse',  'PHD-CSE',  'PhD in Computer Science and Engineering'),
  ('prog-pg-coet-msc-ce',    'dept-coet-sce',   'MSC-CE',   'Master of Science in Structural Engineering'),
  ('prog-pg-coet-msc-ee',    'dept-coet-ee',    'MSC-EE',   'Master of Science in Power Systems and High Voltage Engineering'),
  ('prog-pg-coet-msc-me',    'dept-coet-mie',   'MSC-ME',   'Master of Science in Production Engineering'),
  ('prog-pg-coet-msc-wre',   'dept-coet-wre',   'MSC-WRE',  'Master of Science in Water Resources Engineering'),
  ('prog-pg-coet-phd-eng',   'dept-coet-sce',   'PHD-ENG',  'PhD in Engineering'),
  ('prog-pg-conas-msc-mth',  'dept-conas-mth',  'MSC-MTH',  'Master of Science in Mathematics'),
  ('prog-pg-conas-msc-chm',  'dept-conas-chm',  'MSC-CHM',  'Master of Science in Chemistry'),
  ('prog-pg-conas-msc-phy',  'dept-conas-phy',  'MSC-PHY',  'Master of Science in Physics'),
  ('prog-pg-conas-phd-sci',  'dept-conas-mth',  'PHD-SCI',  'PhD in Natural and Applied Sciences'),
  ('prog-pg-cohu-ma-his',    'dept-cohu-his',   'MA-HIS',   'Master of Arts in History'),
  ('prog-pg-cohu-ma-ling',   'dept-cohu-fll',   'MA-LING',  'Master of Arts in Linguistics'),
  ('prog-pg-cohu-phd-hum',   'dept-cohu-his',   'PHD-HUM',  'PhD in Humanities'),
  ('prog-pg-coss-ma-soc',    'dept-coss-soc',   'MA-SOC',   'Master of Arts in Sociology'),
  ('prog-pg-coss-ma-pspa',   'dept-coss-pspa',  'MA-PSPA',  'Master of Arts in Public Administration'),
  ('prog-pg-coss-ma-stat',   'dept-coss-stat',  'MA-STAT',  'Master of Arts in Statistics'),
  ('prog-pg-udse-ma-econ',   'dept-udse-econ',  'MA-ECON',  'Master of Arts in Economics'),
  ('prog-pg-udbs-mba',       'dept-udbs-gm',    'MBA',      'Master of Business Administration (MBA)'),
  ('prog-pg-udbs-mfin',      'dept-udbs-fin',   'MSC-FIN',  'Master of Science in Finance'),
  ('prog-pg-udbs-phd-bus',   'dept-udbs-gm',    'PHD-BUS',  'PhD in Business Administration'),
  ('prog-pg-soed-med',       'dept-soed-efml',  'MED',      'Master of Education (MEd)'),
  ('prog-pg-soed-pgde',      'dept-soed-epcs',  'PGDE',     'Postgraduate Diploma in Education (PGDE)'),
  ('prog-pg-udsol-llm',      'dept-udsol-publ', 'LLM',      'Master of Laws (LL.M)'),
  ('prog-pg-udsol-phd-law',  'dept-udsol-publ', 'PHD-LAW',  'PhD in Law'),
  ('prog-pg-somg-msc-geo',   'dept-somg-gs',    'MSC-GEO',  'Master of Science in Geology'),
  ('prog-pg-coaf-msc-fst',   'dept-coaf-fst',   'MSC-FST',  'Master of Science in Food Science and Technology'),
  ('prog-pg-mchas-mmed',     'dept-mchas-med',  'MMED',     'Master of Medicine (MMed)'),
  ('prog-pg-ids-ma-ds',      'dept-ids-ds',     'MA-DS',    'Master of Arts in Development Studies'),
  ('prog-pg-iks-ma-kis',     'dept-iks-kis',    'MA-KIS',   'Master of Arts in Kiswahili'),
  ('prog-pg-ims-msc-ms',     'dept-ims-ms',     'MSC-MS',   'Master of Science in Marine Sciences'),
  ('prog-pg-sjmc-ma-mc',     'dept-sjmc-jmc',   'MA-MC',    'Master of Arts in Mass Communication'),
  ('prog-pg-soaf-msc-asft',  'dept-soaf-asft',  'MSC-ASFT', 'Master of Science in Aquatic Sciences')
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`,
  `code` = `new_row`.`code`,
  `department_id` = `new_row`.`department_id`;

-- 3.6 Default System Branding (project_settings)
INSERT INTO `project_settings` (
  `project_id`,
  `university_name`,
  `short_name`,
  `logo_url`,
  `background_url`,
  `primary_color`,
  `font_family`,
  `dashboards_json`,
  `footer_links_json`,
  `blocked_ips_json`
) VALUES (
  'default',
  'University of Dar es Salaam',
  'Clearance',
  '/assets/logo.png',
  '/public/background.png',
  '#123c69',
  'Georgia',
  '[{"id":"academic-staff","name":"Academic Staff","description":"Academic Staff clearance office","enabled":true},{"id":"administrator","name":"Administrator","description":"Administrator clearance office","enabled":true},{"id":"convocation","name":"Convocation","description":"Convocation clearance office","enabled":true},{"id":"daruso","name":"DARUSO","description":"DARUSO clearance office","enabled":true},{"id":"dean-of-students","name":"Dean of Students","description":"Dean of Students clearance office","enabled":true},{"id":"department","name":"Department","description":"Department clearance office","enabled":true},{"id":"director-undergraduate-studies","name":"Director of Undergraduate Studies","description":"DUS Undergraduate clearance & transcript directorate","enabled":true},{"id":"director-postgraduate-studies","name":"Director of Postgraduate Studies","description":"DPGS Postgraduate clearance & transcript directorate","enabled":true},{"id":"dus-secretary","name":"DUS Examination Office","description":"Central certificate verification, sealing & dispatch","enabled":true},{"id":"station-secretary","name":"Station Secretary","description":"Regional collection station vault custody & handover","enabled":true},{"id":"finance","name":"Finance","description":"Finance clearance office","enabled":true},{"id":"games-coach","name":"Games Coach","description":"Games Coach clearance office","enabled":true},{"id":"hall-warden","name":"Hall Warden","description":"Hall Warden clearance office","enabled":true},{"id":"laboratory","name":"Laboratory","description":"Laboratory clearance office","enabled":true},{"id":"lecturer","name":"Lecturer","description":"Lecturer clearance office","enabled":true},{"id":"library","name":"Library","description":"Library clearance office","enabled":true},{"id":"principal","name":"Principal","description":"Principal clearance office","enabled":true},{"id":"smart-card","name":"Smart Card","description":"Smart Card clearance office","enabled":true},{"id":"supervisor","name":"Research Supervisor","description":"Postgraduate Stage 6 Research Supervisor clearance","enabled":true},{"id":"usab","name":"USAB","description":"USAB clearance office","enabled":true},{"id":"workshop","name":"Workshop","description":"Workshop clearance office","enabled":true}]',
  '[{"label":"ARIS 3","url":"https://aris3.udsm.ac.tz/"},{"label":"UDSM","url":"https://www.udsm.ac.tz/"}]',
  '[]'
)
AS `new_row`
ON DUPLICATE KEY UPDATE
  `university_name` = `new_row`.`university_name`,
  `short_name` = `new_row`.`short_name`,
  `dashboards_json` = `new_row`.`dashboards_json`,
  `primary_color` = `new_row`.`primary_color`;

-- ============================================================================
-- END OF PRODUCTION SCHEMA & REFERENCE SEED SCRIPT
-- ============================================================================
