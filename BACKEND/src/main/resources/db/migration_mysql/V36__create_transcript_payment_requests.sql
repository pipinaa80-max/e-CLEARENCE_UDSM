CREATE TABLE transcript_payment_requests (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    project_id VARCHAR(100) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    active_student_id VARCHAR(255) NULL,
    student_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    copies INT NOT NULL,
    amount_tzs INT NOT NULL,
    control_number VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL,
    rejection_reason VARCHAR(500) NULL,
    submitted_at TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP NULL,
    reviewed_by VARCHAR(255) NULL,
    collection_method VARCHAR(30) NULL,
    collection_address VARCHAR(1000) NULL,
    posting_region VARCHAR(100) NULL,
    posting_ward VARCHAR(100) NULL,
    posting_po_box VARCHAR(100) NULL,
    contact_phone VARCHAR(40) NULL,
    contact_email VARCHAR(255) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_transcript_payment_control UNIQUE (project_id, control_number),
    CONSTRAINT uq_transcript_payment_active_student UNIQUE (project_id, active_student_id),
    CONSTRAINT fk_transcript_payment_user FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_transcript_payment_copies CHECK (copies BETWEEN 1 AND 10),
    CONSTRAINT chk_transcript_payment_amount CHECK (amount_tzs > 0),
    CONSTRAINT chk_transcript_payment_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
) ENGINE=InnoDB;

CREATE INDEX idx_transcript_payment_project_status_submitted
    ON transcript_payment_requests (project_id, status, submitted_at);
CREATE INDEX idx_transcript_payment_project_student_submitted
    ON transcript_payment_requests (project_id, student_id, submitted_at);
