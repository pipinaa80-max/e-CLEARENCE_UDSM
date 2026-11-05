-- Flyway Migration V26: Create Sponsors Table, Normalize Typos and Seed Default Sponsors

-- 1. Normalize existing typo data from HELBS to HESLB
UPDATE users SET sponsor = 'HESLB' WHERE UPPER(sponsor) = 'HELBS';
UPDATE students SET sponsor = 'HESLB' WHERE UPPER(sponsor) = 'HELBS';

-- 2. Create Sponsors Table
CREATE TABLE IF NOT EXISTS sponsors (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sponsors_is_active ON sponsors (is_active);

-- 3. Seed Default UDSM Sponsors
INSERT INTO sponsors (id, name, code, description, is_active)
VALUES
  ('spn-heslb', 'HESLB', 'HESLB', 'Higher Education Students'' Loans Board', TRUE),
  ('spn-karimjee', 'Karimjee Scholarships', 'KARIMJEE', 'Karimjee Jivanjee Foundation Scholarship', TRUE),
  ('spn-mo', 'MO scholarship', 'MO', 'Mo Dewji Foundation Scholarship', TRUE),
  ('spn-private', 'PRIVATE', 'PRIVATE', 'Self-sponsored / Private funding', TRUE)
ON CONFLICT (name) DO NOTHING;

