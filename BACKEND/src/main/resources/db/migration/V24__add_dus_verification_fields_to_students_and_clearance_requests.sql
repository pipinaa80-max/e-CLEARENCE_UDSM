-- Flyway Migration V24: Add DUS Secretary Verification & Digital Signature Fields to Students & Clearance Requests

ALTER TABLE students
ADD COLUMN IF NOT EXISTS certificate_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS certificate_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS digital_signature_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS signed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(50) DEFAULT 'Pending Dispatch',
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP;

ALTER TABLE clearance_requests
ADD COLUMN IF NOT EXISTS certificate_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS certificate_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS digital_signature_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS signed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(50) DEFAULT 'Pending Dispatch',
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_students_cert_verified ON students (certificate_verified);
CREATE INDEX IF NOT EXISTS idx_students_dispatch_status ON students (dispatch_status);
