-- Flyway Migration V27: Seed All UDSM Colleges and Departments for Independent Matching

-- 1. Ensure all UDSM Colleges exist in 'colleges' table
INSERT INTO colleges (id, code, name, description, is_active)
VALUES
  ('col-coict', 'CoICT', 'College of Information and Communication Technologies', 'Kijitonyama Campus - Computing, Software, and Telecommunications', TRUE),
  ('col-coet', 'CoET', 'College of Engineering and Technology', 'Main Campus - Engineering, Architecture and Technology', TRUE),
  ('col-conas', 'CoNAS', 'College of Natural and Applied Sciences', 'Main Campus - Natural, Physical and Biological Sciences', TRUE),
  ('col-cohu', 'CoHU', 'College of Humanities', 'Main Campus - Literature, History, Languages and Arts', TRUE),
  ('col-coss', 'CoSS', 'College of Social Sciences', 'Main Campus - Economics, Sociology, Statistics and Political Science', TRUE),
  ('col-udbs', 'UDBS', 'University of Dar es Salaam Business School', 'Main Campus - Accounting, Finance, Marketing and Management', TRUE),
  ('col-soed', 'SoED', 'School of Education', 'Main Campus - Educational Foundations and Curriculum', TRUE),
  ('col-udsol', 'UDSoL', 'University of Dar es Salaam School of Law', 'Main Campus - Legal Studies, Public and Private Law', TRUE),
  ('col-somg', 'SoMG', 'College of Mines and Geosciences', 'Main Campus - Geosciences, Mining and Petroleum Engineering', TRUE),
  ('col-sjmc', 'SJMC', 'School of Journalism and Mass Communication', 'Mikocheni Campus - Journalism, Media and PR', TRUE),
  ('col-ids', 'IDS', 'Institute of Development Studies', 'Main Campus - Development Studies and Research', TRUE),
  ('col-coaf', 'CoAF', 'College of Agricultural Sciences and Food Technology', 'Main Campus - Agriculture, Food and Bio-resources', TRUE),
  ('col-mchas', 'MCHAS', 'Mbeya College of Health and Allied Sciences', 'Mbeya Campus - Health, Medicine and Clinical Sciences', TRUE),
  ('col-duce', 'DUCE', 'Dar es Salaam University College of Education', 'Chang''ombe Campus - Constituent College of Education', TRUE),
  ('col-muce', 'MUCE', 'Mkwawa University College of Education', 'Iringa Campus - Constituent College of Education', TRUE),
  ('col-soaf', 'SoAF', 'School of Aquatic Sciences and Fisheries Technology', 'Kunduchi Campus - Marine and Aquatic Sciences', TRUE),
  ('col-iks', 'IKS', 'Institute of Kiswahili Studies', 'Main Campus - Kiswahili Language, Literature and Linguistics', TRUE),
  ('col-ims', 'IMS', 'Institute of Marine Sciences', 'Zanzibar Campus - Oceanography and Marine Resources', TRUE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- 2. Seed All UDSM Departments under respective Colleges
-- CoICT Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-coict-cse', 'col-coict', 'CSE', 'Department of Computer Science and Engineering', 'Software Engineering, Computer Science, AI and Computer Networks', TRUE),
  ('dept-coict-ete', 'col-coict', 'ETE', 'Department of Electronics and Telecommunications Engineering', 'Telecommunications, Signal Processing and Electronics', TRUE),
  ('dept-coict-is', 'col-coict', 'IS', 'Department of Information Systems', 'Information Systems, Informatics and Data Management', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- CoET Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-coet-cpe', 'col-coet', 'CPE', 'Chemical and Process Engineering', 'Chemical Engineering and Petrochemical Processes', TRUE),
  ('dept-coet-ee', 'col-coet', 'EE', 'Electrical Engineering', 'Power Systems, Energy and Electrical Technology', TRUE),
  ('dept-coet-mie', 'col-coet', 'MIE', 'Mechanical and Industrial Engineering', 'Mechanical, Industrial and Textile Engineering', TRUE),
  ('dept-coet-sce', 'col-coet', 'SCE', 'Structural and Construction Engineering', 'Civil Engineering, Architecture and Quantity Surveying', TRUE),
  ('dept-coet-tge', 'col-coet', 'TGE', 'Transportation and Geotechnical Engineering', 'Geomatics and Transportation Engineering', TRUE),
  ('dept-coet-wre', 'col-coet', 'WRE', 'Water Resources Engineering', 'Hydrology and Environmental Engineering', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- CoNAS Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-conas-bot', 'col-conas', 'BOT', 'Botany', 'Plant Biology, Ecology and Biodiversity', TRUE),
  ('dept-conas-chm', 'col-conas', 'CHM', 'Chemistry', 'Organic, Inorganic, Physical and Analytical Chemistry', TRUE),
  ('dept-conas-geo', 'col-conas', 'GEO', 'Geology', 'Geosciences and Earth Systems', TRUE),
  ('dept-conas-mth', 'col-conas', 'MTH', 'Mathematics', 'Pure and Applied Mathematics, Statistics', TRUE),
  ('dept-conas-mbb', 'col-conas', 'MBB', 'Molecular Biology and Biotechnology', 'Genetics, Biochemistry and Biotechnology', TRUE),
  ('dept-conas-phy', 'col-conas', 'PHY', 'Physics', 'Applied Physics, Materials and Renewable Energy', TRUE),
  ('dept-conas-zwc', 'col-conas', 'ZWC', 'Zoology and Wildlife Conservation', 'Animal Biology, Ecology and Wildlife Management', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- CoHU Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-cohu-ash', 'col-cohu', 'ASH', 'Archaeology and Heritage Studies', 'Archaeological Research and Cultural Heritage', TRUE),
  ('dept-cohu-ca', 'col-cohu', 'CA', 'Creative Arts', 'Fine Arts, Music, Theatre and Design', TRUE),
  ('dept-cohu-fll', 'col-cohu', 'FLL', 'Foreign Languages and Linguistics', 'Linguistics, French, Chinese and Literature', TRUE),
  ('dept-cohu-his', 'col-cohu', 'HIS', 'History', 'African, Regional and Global History', TRUE),
  ('dept-cohu-prs', 'col-cohu', 'PRS', 'Philosophy and Religious Studies', 'Ethics, Philosophy and Comparative Religion', TRUE),
  ('dept-cohu-lcm', 'col-cohu', 'LCM', 'Literature, Communication and Media', 'Literary Studies and Publishing', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- CoSS Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-coss-econ', 'col-coss', 'ECON', 'Economics', 'Applied, Development and Financial Economics', TRUE),
  ('dept-coss-geo', 'col-coss', 'GEO-SS', 'Geography', 'Human Geography, GIS and Environmental Management', TRUE),
  ('dept-coss-pspa', 'col-coss', 'PSPA', 'Political Science and Public Administration', 'Governance, Policy and Public Administration', TRUE),
  ('dept-coss-soc', 'col-coss', 'SOC', 'Sociology', 'Social Development and Anthropology', TRUE),
  ('dept-coss-stat', 'col-coss', 'STAT', 'Statistics', 'Official Statistics and Data Analytics', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- UDBS Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-udbs-acct', 'col-udbs', 'ACCT', 'Accounting', 'Financial, Forensic and Management Accounting', TRUE),
  ('dept-udbs-fin', 'col-udbs', 'FIN', 'Finance', 'Banking, Corporate Finance and Investment', TRUE),
  ('dept-udbs-gm', 'col-udbs', 'GM', 'General Management', 'Human Resource and Strategic Management', TRUE),
  ('dept-udbs-mkt', 'col-udbs', 'MKT', 'Marketing', 'Commerce, Supply Chain and Marketing', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- SoED Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-soed-efml', 'col-soed', 'EFML', 'Educational Foundations, Management and Lifelong Learning', 'Policy, Leadership and Foundations', TRUE),
  ('dept-soed-epcs', 'col-soed', 'EPCS', 'Educational Psychology and Curriculum Studies', 'Psychology, Special Needs and Curriculum', TRUE),
  ('dept-soed-pess', 'col-soed', 'PESS', 'Physical Education and Sport Sciences', 'Sports Science and Physical Education', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- UDSoL Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-udsol-publ', 'col-udsol', 'PUB-L', 'Public Law', 'Constitutional, Human Rights and Administrative Law', TRUE),
  ('dept-udsol-privl', 'col-udsol', 'PRIV-L', 'Private Law', 'Commercial, Contract and Family Law', TRUE),
  ('dept-udsol-econl', 'col-udsol', 'ECON-L', 'Economic Law', 'Trade, Tax and Intellectual Property Law', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- SoMG Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-somg-gs', 'col-somg', 'GS', 'Geosciences', 'Geology, Geophysics and Earth Sciences', TRUE),
  ('dept-somg-mmpe', 'col-somg', 'MMPE', 'Mining and Mineral Processing Engineering', 'Mining, Mineral Processing and Metallurgy', TRUE),
  ('dept-somg-pse', 'col-somg', 'PSE', 'Petroleum Science and Engineering', 'Oil, Gas and Petroleum Geosciences', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- CoAF Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-coaf-aeb', 'col-coaf', 'AEB', 'Agricultural Economics and Business', 'Agribusiness and Resource Economics', TRUE),
  ('dept-coaf-ae', 'col-coaf', 'AE', 'Agricultural Engineering', 'Farm Mechanization and Irrigation Engineering', TRUE),
  ('dept-coaf-csbt', 'col-coaf', 'CSBT', 'Crop Sciences and Beekeeping Technology', 'Agronomy and Apiculture', TRUE),
  ('dept-coaf-fst', 'col-coaf', 'FST', 'Food Science and Technology', 'Food Processing, Nutrition and Quality Control', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

-- MCHAS Departments
INSERT INTO departments (id, college_id, code, name, description, is_active)
VALUES
  ('dept-mchas-med', 'col-mchas', 'MED', 'Clinical Medicine', 'Internal Medicine and Clinical Practice', TRUE),
  ('dept-mchas-pharm', 'col-mchas', 'PHARM', 'Pharmacy', 'Pharmaceutical Sciences and Therapeutics', TRUE),
  ('dept-mchas-nurs', 'col-mchas', 'NURS', 'Nursing', 'Nursing Sciences and Community Health', TRUE)
ON CONFLICT (college_id, code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = TRUE;

