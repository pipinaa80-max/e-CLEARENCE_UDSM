ALTER TABLE notifications ADD COLUMN IF NOT EXISTS project_id VARCHAR(100);
ALTER TABLE convocation_receipts ADD COLUMN IF NOT EXISTS project_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS project_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications (project_id);
CREATE INDEX IF NOT EXISTS idx_convocation_receipts_project_id ON convocation_receipts (project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_users_project_id ON users (project_id);
CREATE INDEX IF NOT EXISTS idx_students_project_id ON students (project_id);
CREATE INDEX IF NOT EXISTS idx_clearance_requests_project_id ON clearance_requests (project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents (project_id);

-- Existing V1 constraints were global. Project accounts must be isolated while
-- retaining uniqueness inside each project (NULL project_id remains global).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_registration_number_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_email_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_registration_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_project
    ON users (lower(email), COALESCE(project_id, '__global__'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_registration_project
    ON users (registration_number, COALESCE(project_id, '__global__'))
    WHERE registration_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_registration_project
    ON students (registration_number, COALESCE(project_id, '__global__'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_email_project
    ON students (lower(email), COALESCE(project_id, '__global__'))
    WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS project_settings (
    project_id VARCHAR(100) PRIMARY KEY,
    university_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(1000),
    primary_color VARCHAR(20),
    font_family VARCHAR(100),
    dashboards_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_local_storage (
    id BIGSERIAL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    storage_key VARCHAR(150) NOT NULL,
    storage_value TEXT NOT NULL,
    imported_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_local_storage_project_key
    ON project_local_storage (project_id, storage_key);
