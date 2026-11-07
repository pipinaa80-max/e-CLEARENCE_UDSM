-- =============================================================================
-- MySQL Initial Schema and Seeding for e-Clearance System
-- Compatible with MySQL 8.0+ and MariaDB 10.5+
-- =============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NULL,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255) NULL,
    last_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(255) NULL,
    programme VARCHAR(255) NULL,
    college VARCHAR(255) NULL,
    department VARCHAR(255) NULL,
    academic_year VARCHAR(255) NULL,
    graduation_year VARCHAR(255) NULL,
    semester VARCHAR(255) NULL,
    year_of_study VARCHAR(255) NULL,
    phone_number VARCHAR(255) NULL,
    hall VARCHAR(255) NULL,
    wing VARCHAR(255) NULL,
    block VARCHAR(255) NULL,
    room_number VARCHAR(255) NULL,
    physical_address VARCHAR(255) NULL,
    sponsor VARCHAR(255) NULL,
    photo LONGTEXT NULL,
    role VARCHAR(255) NULL,
    is_active TINYINT(1) DEFAULT 1,
    is_email_verified TINYINT(1) DEFAULT 0,
    is_locked TINYINT(1) DEFAULT 0,
    lock_reason VARCHAR(255) NULL,
    lock_time DATETIME(6) NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expiry DATETIME(6) NULL,
    verification_token VARCHAR(255) NULL,
    verification_token_expiry DATETIME(6) NULL,
    last_login DATETIME(6) NULL,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    created_by VARCHAR(255) NULL,
    updated_by VARCHAR(255) NULL,
    project_id VARCHAR(100) NULL,
    last_login_ip VARCHAR(255) NULL,
    last_login_device VARCHAR(255) NULL,
    institutional_domain VARCHAR(253) NULL,
    station_code VARCHAR(50) NULL,
    station_name VARCHAR(255) NULL,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_registration_number (registration_number),
    INDEX idx_users_project_id (project_id),
    INDEX idx_users_role (role),
    INDEX idx_users_station_code (station_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    registration_number VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone_number VARCHAR(255) NULL,
    programme VARCHAR(255) NULL,
    faculty VARCHAR(255) NULL,
    college VARCHAR(255) NULL,
    department VARCHAR(255) NULL,
    year_of_study VARCHAR(255) NULL,
    academic_year VARCHAR(255) NULL,
    date_of_birth DATE NULL,
    nationality VARCHAR(255) NULL,
    address VARCHAR(255) NULL,
    profile_image_url VARCHAR(255) NULL,
    hall VARCHAR(255) NULL,
    wing VARCHAR(255) NULL,
    block VARCHAR(255) NULL,
    room_number VARCHAR(255) NULL,
    physical_address VARCHAR(255) NULL,
    sponsor VARCHAR(255) NULL,
    photo LONGTEXT NULL,
    graduation_year VARCHAR(255) NULL,
    semester VARCHAR(255) NULL,
    is_final_year TINYINT(1) DEFAULT 1,
    clearance_status VARCHAR(255) NULL,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    project_id VARCHAR(100) NULL,
    user_id VARCHAR(255) NULL,
    certificate_verified TINYINT(1) DEFAULT 0,
    certificate_verified_at DATETIME(6) NULL,
    digital_signature_hash VARCHAR(255) NULL,
    signed_by VARCHAR(255) NULL,
    signed_at DATETIME(6) NULL,
    dispatch_status VARCHAR(50) DEFAULT 'Pending Dispatch',
    dispatched_at DATETIME(6) NULL,
    station_code VARCHAR(50) NULL,
    station_name VARCHAR(255) NULL,
    intake_status VARCHAR(50) DEFAULT 'Awaiting Intake',
    station_received_at DATETIME(6) NULL,
    station_received_by VARCHAR(255) NULL,
    vault_locker_number VARCHAR(100) NULL,
    handover_collector_type VARCHAR(100) NULL,
    handover_collector_name VARCHAR(255) NULL,
    handover_collector_id VARCHAR(100) NULL,
    handover_collector_phone VARCHAR(50) NULL,
    handover_approved_at DATETIME(6) NULL,
    handover_secretary VARCHAR(255) NULL,
    handover_receipt_token VARCHAR(255) NULL,
    transit_issue_notes TEXT NULL,
    INDEX idx_students_registration_number (registration_number),
    INDEX idx_students_user_id (user_id),
    INDEX idx_students_project_id (project_id),
    INDEX idx_students_cert_verified (certificate_verified),
    INDEX idx_students_dispatch_status (dispatch_status),
    INDEX idx_students_station_code (station_code),
    INDEX idx_students_intake_status (intake_status),
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Clearance Requests Table
CREATE TABLE IF NOT EXISTS clearance_requests (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    current_stage VARCHAR(255) NULL,
    current_office VARCHAR(255) NULL,
    submitted_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    college VARCHAR(255) NULL,
    department VARCHAR(255) NULL,
    programme VARCHAR(255) NULL,
    project_id VARCHAR(100) NULL,
    certificate_verified TINYINT(1) DEFAULT 0,
    certificate_verified_at DATETIME(6) NULL,
    digital_signature_hash VARCHAR(255) NULL,
    signed_by VARCHAR(255) NULL,
    signed_at DATETIME(6) NULL,
    dispatch_status VARCHAR(50) DEFAULT 'Pending Dispatch',
    dispatched_at DATETIME(6) NULL,
    INDEX idx_clearance_requests_student_id (student_id),
    INDEX idx_clearance_requests_project_id (project_id),
    CONSTRAINT fk_clearance_requests_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Department Approvals Table
CREATE TABLE IF NOT EXISTS department_approvals (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    clearance_request_id BIGINT NULL,
    department VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    approved_by VARCHAR(255) NULL,
    approval_date DATETIME(6) NULL,
    comments VARCHAR(255) NULL,
    order_number INT NULL,
    INDEX idx_department_approvals_request_id (clearance_request_id),
    CONSTRAINT fk_department_approvals_request FOREIGN KEY (clearance_request_id) REFERENCES clearance_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(255) NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    file_size BIGINT NULL,
    description VARCHAR(255) NULL,
    upload_date DATETIME(6) NULL,
    document_category VARCHAR(255) NULL,
    is_verified TINYINT(1) DEFAULT 0,
    verified_by VARCHAR(255) NULL,
    verified_date DATETIME(6) NULL,
    verification_comment VARCHAR(255) NULL,
    student_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(100) NULL,
    INDEX idx_documents_student_id (student_id),
    INDEX idx_documents_project_id (project_id),
    CONSTRAINT fk_documents_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id VARCHAR(255) NULL,
    student_id VARCHAR(255) NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(255) NULL,
    is_read TINYINT(1) DEFAULT 0,
    read_at DATETIME(6) NULL,
    created_at DATETIME(6) NULL,
    link VARCHAR(255) NULL,
    project_id VARCHAR(100) NULL,
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_student_id (student_id),
    INDEX idx_notifications_project_id (project_id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Convocation Receipts Table
CREATE TABLE IF NOT EXISTS convocation_receipts (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    control_number VARCHAR(255) NOT NULL,
    receipt_number VARCHAR(255) NOT NULL,
    payment_date VARCHAR(255) NULL,
    file_name VARCHAR(255) NULL,
    file_url VARCHAR(255) NULL,
    file_type VARCHAR(255) NULL,
    file_size BIGINT NULL,
    status VARCHAR(255) NULL,
    approved_by VARCHAR(255) NULL,
    approved_at DATETIME(6) NULL,
    comments VARCHAR(255) NULL,
    submitted_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    project_id VARCHAR(100) NULL,
    INDEX idx_convocation_receipts_student_id (student_id),
    INDEX idx_convocation_receipts_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id VARCHAR(255) NULL,
    username VARCHAR(255) NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(255) NULL,
    user_agent VARCHAR(255) NULL,
    status VARCHAR(255) NULL,
    created_at DATETIME(6) NULL,
    project_id VARCHAR(100) NULL,
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Student Debt Flags Table
CREATE TABLE IF NOT EXISTS student_debt_flags (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    registration_number VARCHAR(50) NOT NULL,
    student_name VARCHAR(255) NULL,
    college VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    programme VARCHAR(255) NULL,
    amount DECIMAL(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    negotiation_notes TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    lecturer_id VARCHAR(36) NOT NULL,
    lecturer_name VARCHAR(255) NULL,
    resolution_note TEXT NULL,
    resolved_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    project_id VARCHAR(100) NULL,
    INDEX idx_student_debt_flags_student_id (student_id),
    INDEX idx_student_debt_flags_scope_status (college, department, status),
    INDEX idx_student_debt_flags_registration_status (registration_number, status),
    INDEX idx_student_debt_flags_lecturer (lecturer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Project Settings Table
CREATE TABLE IF NOT EXISTS project_settings (
    project_id VARCHAR(100) NOT NULL PRIMARY KEY,
    university_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(1000) NULL,
    background_url TEXT NULL,
    primary_color VARCHAR(20) NULL,
    font_family VARCHAR(100) NULL,
    dashboards_json TEXT NOT NULL,
    footer_links_json TEXT NULL,
    blocked_ips_json TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Project Local Storage Table
CREATE TABLE IF NOT EXISTS project_local_storage (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    storage_key VARCHAR(150) NOT NULL,
    storage_value TEXT NOT NULL,
    imported_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_project_local_storage_project_key (project_id, storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Colleges Table
CREATE TABLE IF NOT EXISTS colleges (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_colleges_code (code),
    INDEX idx_colleges_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    college_id VARCHAR(36) NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_college_dept_code UNIQUE (college_id, code),
    INDEX idx_departments_college_id (college_id),
    INDEX idx_departments_code (code),
    INDEX idx_departments_is_active (is_active),
    CONSTRAINT fk_departments_college FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Collection Stations Table
CREATE TABLE IF NOT EXISTS collection_stations (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    district VARCHAR(100) NULL,
    address TEXT NOT NULL,
    operating_hours VARCHAR(255) DEFAULT 'Mon - Fri: 08:00 - 16:00',
    contact_phone VARCHAR(50) NULL,
    contact_email VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_stations_region (region),
    INDEX idx_stations_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Reference Tables
CREATE TABLE IF NOT EXISTS ref_colleges (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_departments (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    college_id VARCHAR(36) NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT fk_ref_dept_college FOREIGN KEY (college_id) REFERENCES ref_colleges(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_programmes (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    department_id VARCHAR(36) NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT fk_ref_prog_dept FOREIGN KEY (department_id) REFERENCES ref_departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_halls (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Unified Student Profiles View
CREATE OR REPLACE VIEW vw_student_profiles AS
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
FROM users u
LEFT JOIN students s ON s.user_id = u.id;

-- 17. Seed Primary Colleges
INSERT INTO colleges (id, code, name, description, is_active)
VALUES
  ('col-coict', 'CoICT', 'College of Information and Communication Technologies', 'Kijitonyama Campus - Computing and ICT', 1),
  ('col-coet', 'CoET', 'College of Engineering and Technology', 'Main Campus - Engineering, Metallurgy and Architecture', 1),
  ('col-conas', 'CoNAS', 'College of Natural and Applied Sciences', 'Main Campus - Science, Biology, Chemistry and Physics', 1),
  ('col-cohu', 'CoHU', 'College of Humanities', 'Main Campus - Literature, History, Languages and Fine Arts', 1),
  ('col-coss', 'CoSS', 'College of Social Sciences', 'Main Campus - Economics, Sociology and Political Science', 1),
  ('col-udbs', 'UDBS', 'University of Dar es Salaam Business School', 'Main Campus - Finance, Accounting and Marketing', 1),
  ('col-soed', 'SoED', 'School of Education', 'Main Campus - Educational Studies and Teacher Training', 1),
  ('col-udsol', 'UDSoL', 'University of Dar es Salaam School of Law', 'Main Campus - Legal Studies', 1)
ON DUPLICATE KEY UPDATE
name = VALUES(name), description = VALUES(description);

-- 18. Seed Primary Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-coict-cse', 'col-coict', 'CSE', 'Department of Computer Science and Engineering', 'Software Engineering, AI, and Network Systems', 1),
  ('dept-coict-ete', 'col-coict', 'ETE', 'Department of Electronics and Telecommunications Engineering', 'Electronics, Signal Processing and Telecommunications', 1),
  ('dept-coict-is', 'col-coict', 'IS', 'Department of Information Systems', 'Information Systems Management and Data Analytics', 1),
  ('dept-coet-cpe', 'col-coet', 'CPE', 'Chemical and Process Engineering', 'Chemical Engineering and Process Technologies', 1),
  ('dept-coet-ee', 'col-coet', 'EE', 'Electrical Engineering', 'Power Systems and Electrical Machines', 1),
  ('dept-coet-mie', 'col-coet', 'MIE', 'Mechanical and Industrial Engineering', 'Mechanical Systems and Industrial Management', 1),
  ('dept-coet-wre', 'col-coet', 'WRE', 'Water Resources and Environmental Engineering', 'Hydrology and Environmental Engineering', 1),
  ('dept-conas-zwc', 'col-conas', 'ZWC', 'Zoology and Wildlife Conservation', 'Biological Conservation and Animal Biology', 1),
  ('dept-conas-mbb', 'col-conas', 'MBB', 'Molecular Biology and Biotechnology', 'Genetics, Biochemistry and Biotechnology', 1),
  ('dept-conas-phy', 'col-conas', 'PHY', 'Physics Department', 'Applied Physics, Materials and Renewable Energy', 1),
  ('dept-conas-chm', 'col-conas', 'CHM', 'Chemistry Department', 'Analytical, Inorganic and Organic Chemistry', 1)
ON DUPLICATE KEY UPDATE
name = VALUES(name);

-- 19. Seed Primary Collection Stations
INSERT INTO collection_stations (id, code, name, region, district, address, operating_hours, contact_phone, contact_email, is_active)
VALUES
  ('stn-udsm-main', 'UDSM-MAIN', 'UDSM Main Campus - DUS Central Station', 'Dar es Salaam', 'Ubunifu / Kinondoni', 'DUS Building Room 102, Main Campus', 'Mon - Fri: 08:00 - 16:00', '+255 22 2410500', 'dus.collection@udsm.ac.tz', 1),
  ('stn-coict-kijito', 'COICT-HUB', 'CoICT Kijitonyama Dispatch Center', 'Dar es Salaam', 'Kijitonyama', 'CoICT Block A Ground Floor, Kijitonyama Campus', 'Mon - Fri: 08:00 - 16:00', '+255 22 2700010', 'coict.collection@udsm.ac.tz', 1),
  ('stn-arusha-hub', 'ARUSHA-HUB', 'UDSM Arusha Regional Collection Station', 'Arusha', 'Arusha Urban', 'UDSM Extension Center, Clocktower Street', 'Mon - Fri: 08:30 - 16:30', '+255 27 2548890', 'arusha.center@udsm.ac.tz', 1),
  ('stn-mwanza-hub', 'MWANZA-HUB', 'UDSM Mwanza Regional Collection Station', 'Mwanza', 'Nyamagana', 'UDSM Lake Zone Center, Station Road', 'Mon - Fri: 08:30 - 16:30', '+255 28 2500411', 'mwanza.center@udsm.ac.tz', 1),
  ('stn-mbeya-hub', 'MBEYA-HUB', 'UDSM Mbeya Regional Collection Station', 'Mbeya', 'Mbeya City', 'UDSM Southern Highlands Bureau, Posta Street', 'Mon - Fri: 08:30 - 16:30', '+255 25 2502200', 'mbeya.center@udsm.ac.tz', 1),
  ('stn-dodoma-hub', 'DODOMA-HUB', 'UDSM Capital Dodoma Collection Bureau', 'Dodoma', 'Dodoma Urban', 'Government City Sub-Bureau, Block B', 'Mon - Fri: 08:00 - 16:00', '+255 26 2321100', 'dodoma.center@udsm.ac.tz', 1)
ON DUPLICATE KEY UPDATE
name = VALUES(name), address = VALUES(address), operating_hours = VALUES(operating_hours);

-- 20. High-Concurrency Scalability Composite Indexes
CREATE INDEX idx_clearance_college_dept_status ON clearance_requests (college, department, status);
CREATE INDEX idx_clearance_student_status ON clearance_requests (student_id, status);
CREATE INDEX idx_students_college_dept_status ON students (college, department, clearance_status);
CREATE INDEX idx_students_station_intake ON students (station_code, intake_status);
CREATE INDEX idx_approvals_dept_status ON department_approvals (department, status);
CREATE INDEX idx_approvals_req_dept_status ON department_approvals (clearance_request_id, department, status);
CREATE INDEX idx_users_role_is_active ON users (role, is_active);

