-- Flyway Migration V26: High-Concurrency Scalability Composite Indexes
-- Eliminates full table scans during clearance season queries across departments, colleges, and approvals

CREATE INDEX IF NOT EXISTS idx_clearance_college_dept_status
    ON clearance_requests (college, department, status);

CREATE INDEX IF NOT EXISTS idx_clearance_student_status
    ON clearance_requests (student_id, status);

CREATE INDEX IF NOT EXISTS idx_students_college_dept_status
    ON students (college, department, clearance_status);

CREATE INDEX IF NOT EXISTS idx_students_station_intake
    ON students (station_code, intake_status);

CREATE INDEX IF NOT EXISTS idx_approvals_dept_status
    ON department_approvals (department, status);

CREATE INDEX IF NOT EXISTS idx_approvals_req_dept_status
    ON department_approvals (clearance_request_id, department, status);

CREATE INDEX IF NOT EXISTS idx_users_role_is_active
    ON users (role, is_active);
