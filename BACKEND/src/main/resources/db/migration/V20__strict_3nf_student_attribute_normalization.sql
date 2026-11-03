-- Flyway Migration V20: Strict 3NF Normalization - Consolidating Student Academic Attributes

-- 0. Drop any legacy recursive triggers and functions to prevent infinite recursion
DROP TRIGGER IF EXISTS trg_sync_user_to_student ON users;
DROP TRIGGER IF EXISTS trg_sync_student_to_user ON students;
DROP FUNCTION IF EXISTS fn_sync_user_to_student();
DROP FUNCTION IF EXISTS fn_sync_student_to_user();

-- 1. Create Lookup Reference Tables for Organizational Structure
CREATE TABLE IF NOT EXISTS ref_colleges (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_departments (
    id VARCHAR(36) PRIMARY KEY,
    college_id VARCHAR(36) REFERENCES ref_colleges(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_programmes (
    id VARCHAR(36) PRIMARY KEY,
    department_id VARCHAR(36) REFERENCES ref_departments(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_halls (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Populate missing fields in students table from users table prior to cleanup
UPDATE students s
SET
    programme = COALESCE(s.programme, u.programme),
    college = COALESCE(s.college, u.college),
    faculty = COALESCE(s.faculty, u.college),
    department = COALESCE(s.department, u.department),
    academic_year = COALESCE(s.academic_year, u.academic_year),
    graduation_year = COALESCE(s.graduation_year, u.graduation_year),
    semester = COALESCE(s.semester, u.semester),
    year_of_study = COALESCE(s.year_of_study, u.year_of_study),
    hall = COALESCE(s.hall, u.hall),
    wing = COALESCE(s.wing, u.wing),
    block = COALESCE(s.block, u.block),
    room_number = COALESCE(s.room_number, u.room_number),
    sponsor = COALESCE(s.sponsor, u.sponsor),
    photo = COALESCE(s.photo, u.photo)
FROM users u
WHERE s.user_id = u.id;

-- 3. Create a unified database view for 3NF normalized queries
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
