-- Flyway Migration V19: Enforce relational normalization, foreign key synchronization and performance indexes

-- 1. Ensure all student records are correctly linked to their corresponding user record by user_id
UPDATE students s
SET user_id = u.id
FROM users u
WHERE s.user_id IS NULL
  AND u.registration_number IS NOT NULL
  AND s.registration_number = u.registration_number;

UPDATE students s
SET user_id = u.id
FROM users u
WHERE s.user_id IS NULL
  AND u.email IS NOT NULL
  AND LOWER(s.email) = LOWER(u.email);

-- 2. Drop legacy triggers if present to prevent infinite recursion
DROP TRIGGER IF EXISTS trg_sync_user_to_student ON users;
DROP TRIGGER IF EXISTS trg_sync_student_to_user ON students;
DROP FUNCTION IF EXISTS fn_sync_user_to_student();
DROP FUNCTION IF EXISTS fn_sync_student_to_user();

-- 3. Create indexes for foreign keys and lookup performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id);
CREATE INDEX IF NOT EXISTS idx_students_registration_number ON students (registration_number);
CREATE INDEX IF NOT EXISTS idx_users_registration_number ON users (registration_number);
CREATE INDEX IF NOT EXISTS idx_clearance_requests_student_id ON clearance_requests (student_id);
CREATE INDEX IF NOT EXISTS idx_department_approvals_request_id ON department_approvals (clearance_request_id);
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents (student_id);
CREATE INDEX IF NOT EXISTS idx_student_debt_flags_student_id ON student_debt_flags (student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON notifications (student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
