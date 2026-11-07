-- Flyway Migration V29: Add lecturer email and phone to student_debt_flags
ALTER TABLE student_debt_flags ADD COLUMN IF NOT EXISTS lecturer_email VARCHAR(255);
ALTER TABLE student_debt_flags ADD COLUMN IF NOT EXISTS lecturer_phone VARCHAR(50);
