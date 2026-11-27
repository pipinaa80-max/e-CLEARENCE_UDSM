-- ============================================================================
-- UDSM e-Clearance & Transcript MIS — Postgraduate, Supervisor & DPGS Upgrade
-- ============================================================================
-- Purpose       : Non-destructive upgrade for EXISTING MySQL 8.0+ databases
--                 Mirrors Knex migration 20261126000009_add_postgraduate_supervisor_dpgs.js
-- Safety        : Safe to run on live databases with existing users/students/requests.
--                 Zero data loss; uses stored helper to skip existing columns.
-- ============================================================================

SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';

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

-- 1. users table
CALL `udsm_add_col_if_missing`('users', 'award', 'VARCHAR(255) NULL AFTER `year_of_study`');
CALL `udsm_add_col_if_missing`('users', 'is_postgraduate', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `award`');

-- 2. students table
CALL `udsm_add_col_if_missing`('students', 'award', 'VARCHAR(255) NULL AFTER `graduation_year`');
CALL `udsm_add_col_if_missing`('students', 'is_postgraduate', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `award`');
CALL `udsm_add_col_if_missing`('students', 'undergraduate_certificate_url', 'LONGTEXT NULL AFTER `is_postgraduate`');

-- 3. clearance_requests table
CALL `udsm_add_col_if_missing`('clearance_requests', 'award', 'VARCHAR(255) NULL AFTER `physical_address`');
CALL `udsm_add_col_if_missing`('clearance_requests', 'is_postgraduate', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `award`');
CALL `udsm_add_col_if_missing`('clearance_requests', 'undergraduate_certificate_url', 'LONGTEXT NULL AFTER `is_postgraduate`');

-- 4. transcript_payment_requests table (Director "Issue & Forward" persistence)
CALL `udsm_add_col_if_missing`('transcript_payment_requests', 'issued_by_director', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `contact_email`');
CALL `udsm_add_col_if_missing`('transcript_payment_requests', 'issued_by_director_title', 'VARCHAR(255) NULL AFTER `issued_by_director`');
CALL `udsm_add_col_if_missing`('transcript_payment_requests', 'issued_at', 'DATETIME(6) NULL AFTER `issued_by_director_title`');

DROP PROCEDURE IF EXISTS `udsm_add_col_if_missing`;

-- 5. Refresh vw_student_profiles view
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
