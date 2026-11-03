-- Flyway Migration V25: Add Station Secretary Intake and Handover Fields

ALTER TABLE students
ADD COLUMN IF NOT EXISTS station_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS station_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS intake_status VARCHAR(50) DEFAULT 'Awaiting Intake',
ADD COLUMN IF NOT EXISTS station_received_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS station_received_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS vault_locker_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS handover_collector_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS handover_collector_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS handover_collector_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS handover_collector_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS handover_approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS handover_secretary VARCHAR(255),
ADD COLUMN IF NOT EXISTS handover_receipt_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS transit_issue_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_students_station_code ON students (station_code);
CREATE INDEX IF NOT EXISTS idx_students_intake_status ON students (intake_status);
