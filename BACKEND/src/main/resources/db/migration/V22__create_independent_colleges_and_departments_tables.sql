-- Flyway Migration V22: Independent Colleges and Departments Schema & Seeding

-- 1. Create Independent Colleges Table
CREATE TABLE IF NOT EXISTS colleges (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Independent Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    college_id VARCHAR(36) REFERENCES colleges(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_college_dept_code UNIQUE (college_id, code)
);

-- 3. Indexes for lookup performance
CREATE INDEX IF NOT EXISTS idx_colleges_code ON colleges (code);
CREATE INDEX IF NOT EXISTS idx_colleges_is_active ON colleges (is_active);
CREATE INDEX IF NOT EXISTS idx_departments_college_id ON departments (college_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments (code);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments (is_active);

-- 4. Seed Primary UDSM Colleges
INSERT INTO colleges (id, code, name, description, is_active)
VALUES
  ('col-coict', 'CoICT', 'College of Information and Communication Technologies', 'Kijitonyama Campus - Computing and ICT', TRUE),
  ('col-coet', 'CoET', 'College of Engineering and Technology', 'Main Campus - Engineering, Metallurgy and Architecture', TRUE),
  ('col-conas', 'CoNAS', 'College of Natural and Applied Sciences', 'Main Campus - Science, Biology, Chemistry and Physics', TRUE),
  ('col-cohu', 'CoHU', 'College of Humanities', 'Main Campus - Literature, History, Languages and Fine Arts', TRUE),
  ('col-coss', 'CoSS', 'College of Social Sciences', 'Main Campus - Economics, Sociology and Political Science', TRUE),
  ('col-udbs', 'UDBS', 'University of Dar es Salaam Business School', 'Main Campus - Finance, Accounting and Marketing', TRUE),
  ('col-soed', 'SoED', 'School of Education', 'Main Campus - Educational Studies and Teacher Training', TRUE),
  ('col-udsol', 'UDSoL', 'University of Dar es Salaam School of Law', 'Main Campus - Legal Studies', TRUE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 5. Seed Primary UDSM Departments under Colleges
-- CoICT Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-coict-cse', 'col-coict', 'CSE', 'Department of Computer Science and Engineering', 'Software Engineering, AI, and Network Systems', TRUE),
  ('dept-coict-ete', 'col-coict', 'ETE', 'Department of Electronics and Telecommunications Engineering', 'Electronics, Signal Processing and Telecommunications', TRUE),
  ('dept-coict-is', 'col-coict', 'IS', 'Department of Information Systems', 'Information Systems Management and Data Analytics', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name;

-- CoET Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-coet-cpe', 'col-coet', 'CPE', 'Chemical and Process Engineering', 'Chemical Engineering and Process Technologies', TRUE),
  ('dept-coet-ee', 'col-coet', 'EE', 'Electrical Engineering', 'Power Systems and Electrical Machines', TRUE),
  ('dept-coet-mie', 'col-coet', 'MIE', 'Mechanical and Industrial Engineering', 'Mechanical Systems and Industrial Management', TRUE),
  ('dept-coet-wre', 'col-coet', 'WRE', 'Water Resources and Environmental Engineering', 'Hydrology and Environmental Engineering', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name;

-- CoNAS Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-conas-zwc', 'col-conas', 'ZWC', 'Zoology and Wildlife Conservation', 'Biological Conservation and Animal Biology', TRUE),
  ('dept-conas-mbb', 'col-conas', 'MBB', 'Molecular Biology and Biotechnology', 'Genetics, Biochemistry and Biotechnology', TRUE),
  ('dept-conas-phy', 'col-conas', 'PHY', 'Physics Department', 'Applied Physics, Materials and Renewable Energy', TRUE),
  ('dept-conas-chm', 'col-conas', 'CHM', 'Chemistry Department', 'Analytical, Inorganic and Organic Chemistry', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name;
