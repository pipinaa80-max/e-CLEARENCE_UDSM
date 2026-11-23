CREATE TABLE transcript_payment_requests (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    active_student_id VARCHAR(255),
    student_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    copies INTEGER NOT NULL CHECK (copies BETWEEN 1 AND 10),
    amount_tzs INTEGER NOT NULL CHECK (amount_tzs > 0),
    control_number VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    rejection_reason VARCHAR(500),
    submitted_at TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255),
    collection_method VARCHAR(30),
    collection_address VARCHAR(1000),
    posting_region VARCHAR(100),
    posting_ward VARCHAR(100),
    posting_po_box VARCHAR(100),
    contact_phone VARCHAR(40),
    contact_email VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_transcript_payment_control UNIQUE (project_id, control_number),
    CONSTRAINT uq_transcript_payment_active_student UNIQUE (project_id, active_student_id)
);

CREATE INDEX idx_transcript_payment_project_status_submitted
    ON transcript_payment_requests (project_id, status, submitted_at DESC);
CREATE INDEX idx_transcript_payment_project_student_submitted
    ON transcript_payment_requests (project_id, student_id, submitted_at DESC);
