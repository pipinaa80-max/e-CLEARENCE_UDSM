ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (
        role IN (
            'SUPERUSER', 'STUDENT', 'DEPARTMENT_OFFICER', 'FINANCE_OFFICER',
            'LIBRARY_OFFICER', 'ICT_OFFICER', 'ACADEMIC_STAFF', 'ADMINISTRATOR',
            'ADMIN', 'CONVOCATION_OFFICER', 'GAMES_COACH', 'HALL_WARDEN',
            'USAB_OFFICER', 'DARUSO_OFFICER', 'DEAN_OF_STUDENTS',
            'SMART_CARD_OFFICER', 'WORKSHOP_OFFICER', 'PRINCIPAL',
            'LABORATORY_OFFICER', 'LECTURER'
        )
    );

CREATE TABLE student_debt_flags (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    registration_number VARCHAR(50) NOT NULL,
    student_name VARCHAR(255),
    college VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    programme VARCHAR(255),
    amount NUMERIC(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    negotiation_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    lecturer_id VARCHAR(36) NOT NULL,
    lecturer_name VARCHAR(255),
    resolution_note TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    project_id VARCHAR(100)
);

CREATE INDEX idx_student_debt_flags_scope_status
    ON student_debt_flags (college, department, status);

CREATE INDEX idx_student_debt_flags_registration_status
    ON student_debt_flags (registration_number, status);

CREATE INDEX idx_student_debt_flags_lecturer_created
    ON student_debt_flags (lecturer_id, created_at DESC);
