-- Flyway Migration V34: Add item category and due date to student_debt_flags
ALTER TABLE student_debt_flags ADD COLUMN IF NOT EXISTS item_category VARCHAR(100) DEFAULT 'Equipment / Item Rental';
ALTER TABLE student_debt_flags ADD COLUMN IF NOT EXISTS due_date DATE;
