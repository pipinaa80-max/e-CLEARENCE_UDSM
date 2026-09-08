CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    last_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(255) UNIQUE,
    programme VARCHAR(255),
    college VARCHAR(255),
    department VARCHAR(255),
    academic_year VARCHAR(255),
    graduation_year VARCHAR(255),
    semester VARCHAR(255),
    year_of_study VARCHAR(255),
    phone_number VARCHAR(255),
    hall VARCHAR(255),
    room_number VARCHAR(255),
    sponsor VARCHAR(255),
    photo VARCHAR(255),
    role VARCHAR(255),
    is_active BOOLEAN,
    is_email_verified BOOLEAN,
    is_locked BOOLEAN,
    lock_reason VARCHAR(255),
    lock_time TIMESTAMP(6),
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP(6),
    verification_token VARCHAR(255),
    verification_token_expiry TIMESTAMP(6),
    last_login TIMESTAMP(6),
    created_at TIMESTAMP(6),
    updated_at TIMESTAMP(6),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    project_id VARCHAR(100),
    last_login_ip VARCHAR(255),
    last_login_device VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(255) PRIMARY KEY,
    registration_number VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(255),
    programme VARCHAR(255),
    faculty VARCHAR(255),
    college VARCHAR(255),
    department VARCHAR(255),
    year_of_study VARCHAR(255),
    academic_year VARCHAR(255),
    date_of_birth DATE,
    nationality VARCHAR(255),
    address VARCHAR(255),
    profile_image_url VARCHAR(255),
    hall VARCHAR(255),
    room_number VARCHAR(255),
    sponsor VARCHAR(255),
    photo VARCHAR(255),
    graduation_year VARCHAR(255),
    semester VARCHAR(255),
    is_final_year BOOLEAN,
    clearance_status VARCHAR(255),
    created_at TIMESTAMP(6),
    updated_at TIMESTAMP(6),
    project_id VARCHAR(100),
    user_id VARCHAR(255) UNIQUE,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS clearance_requests (
    id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    current_stage VARCHAR(255),
    current_office VARCHAR(255),
    submitted_at TIMESTAMP(6),
    updated_at TIMESTAMP(6),
    college VARCHAR(255),
    department VARCHAR(255),
    programme VARCHAR(255),
    project_id VARCHAR(100),
    CONSTRAINT fk_clearance_requests_student FOREIGN KEY (student_id) REFERENCES students (id)
);

CREATE TABLE IF NOT EXISTS department_approvals (
    id BIGSERIAL PRIMARY KEY,
    clearance_request_id BIGINT,
    department VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    approved_by VARCHAR(255),
    approval_date TIMESTAMP(6),
    comments VARCHAR(255),
    order_number INTEGER,
    CONSTRAINT fk_department_approvals_request FOREIGN KEY (clearance_request_id) REFERENCES clearance_requests (id)
);

CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(255) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(255) NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    file_size BIGINT,
    description VARCHAR(255),
    upload_date TIMESTAMP(6),
    document_category VARCHAR(255),
    is_verified BOOLEAN,
    verified_by VARCHAR(255),
    verified_date TIMESTAMP(6),
    verification_comment VARCHAR(255),
    student_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(100),
    CONSTRAINT fk_documents_student FOREIGN KEY (student_id) REFERENCES students (id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    student_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(255),
    is_read BOOLEAN,
    read_at TIMESTAMP(6),
    created_at TIMESTAMP(6),
    link VARCHAR(255),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_notifications_student FOREIGN KEY (student_id) REFERENCES students (id)
);

CREATE TABLE IF NOT EXISTS convocation_receipts (
    id VARCHAR(255) PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    control_number VARCHAR(255) NOT NULL,
    receipt_number VARCHAR(255) NOT NULL,
    payment_date VARCHAR(255),
    file_name VARCHAR(255),
    file_url VARCHAR(255),
    file_type VARCHAR(255),
    file_size BIGINT,
    status VARCHAR(255),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP(6),
    comments VARCHAR(255),
    submitted_at TIMESTAMP(6),
    updated_at TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    username VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(255),
    user_agent VARCHAR(255),
    status VARCHAR(255),
    created_at TIMESTAMP(6)
);

CREATE INDEX IF NOT EXISTS idx_clearance_requests_student_id ON clearance_requests (student_id);
CREATE INDEX IF NOT EXISTS idx_department_approvals_request_id ON department_approvals (clearance_request_id);
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents (student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON notifications (student_id);
