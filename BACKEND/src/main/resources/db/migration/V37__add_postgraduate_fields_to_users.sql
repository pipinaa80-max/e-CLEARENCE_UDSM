-- Add award and is_postgraduate columns to users table for administrative visibility and classification
ALTER TABLE users ADD COLUMN IF NOT EXISTS award VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_postgraduate BOOLEAN DEFAULT FALSE;
