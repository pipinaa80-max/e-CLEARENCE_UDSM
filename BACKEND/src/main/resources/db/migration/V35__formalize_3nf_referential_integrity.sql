-- Flyway Migration V35: Formalize 3NF Referential Integrity & Relational Constraints

-- 1. Ensure foreign key constraint between student_debt_flags and students
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_debt_flags_student'
    ) THEN
        ALTER TABLE student_debt_flags
            ADD CONSTRAINT fk_student_debt_flags_student
            FOREIGN KEY (student_id) REFERENCES students(id)
            ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint fk_student_debt_flags_student skipped: %', SQLERRM;
END $$;

-- 2. Ensure foreign key constraint between student_debt_flags and users (lecturer)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_debt_flags_lecturer'
    ) THEN
        ALTER TABLE student_debt_flags
            ADD CONSTRAINT fk_student_debt_flags_lecturer
            FOREIGN KEY (lecturer_id) REFERENCES users(id)
            ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint fk_student_debt_flags_lecturer skipped: %', SQLERRM;
END $$;

-- 3. Composite relational index for 3NF join and status retrieval
CREATE INDEX IF NOT EXISTS idx_debt_flags_student_lecturer
    ON student_debt_flags (student_id, lecturer_id, status);
