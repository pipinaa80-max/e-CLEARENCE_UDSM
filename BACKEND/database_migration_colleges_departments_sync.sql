-- ============================================================================
-- UDSM e-Clearance Production Upgrade: Missing Colleges & 14 Departments Sync
-- ============================================================================
-- Target Engine : MySQL 8.0.19+ (uses AS new_row — zero #1287 warnings)
-- Idempotent    : Safe to re-run via ON DUPLICATE KEY UPDATE
-- Adds          : 2 colleges (UDSE, MRI) + 14 departments (13 missing student
--                 departments covering 1,181 students + UDSE :: Economics)
-- ============================================================================

SET NAMES utf8mb4;
START TRANSACTION;

INSERT INTO `colleges` (`id`, `code`, `name`, `description`, `is_active`) VALUES
  ('col-udse', 'UDSE', 'University of Dar es Salaam School of Economics', 'Main Campus - Economics and Applied Statistics', 1),
  ('col-mri',  'MRI',  'Mineral Resources Institute', 'Dodoma / Affiliated Institute - Mining, Geology and Surveying', 1)
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`,
  `description` = `new_row`.`description`,
  `is_active` = `new_row`.`is_active`;

INSERT INTO `ref_colleges` (`id`, `code`, `name`) VALUES
  ('col-udse', 'UDSE', 'University of Dar es Salaam School of Economics'),
  ('col-mri',  'MRI',  'Mineral Resources Institute')
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`;

INSERT INTO `departments` (`id`, `college_id`, `code`, `name`, `description`, `is_active`) VALUES
  ('dept-conas-nas', 'col-conas', 'NAS',     'Natural and Applied Sciences', 'Interdisciplinary Natural and Applied Sciences with Education', 1),
  ('dept-coss-is',   'col-coss',  'IS-SS',   'Information Studies', 'Library and Information Studies', 1),
  ('dept-coss-ss',   'col-coss',  'SS',      'Social Sciences', 'Interdisciplinary Social Sciences and Arts with Education', 1),
  ('dept-udse-econ', 'col-udse',  'ECON-SE', 'Economics', 'Economics and Applied Statistics', 1),
  ('dept-ids-ds',    'col-ids',   'DS',      'Development Studies', 'Development Studies and Research', 1),
  ('dept-iks-kis',   'col-iks',   'KIS',     'Kiswahili', 'Kiswahili Language, Literature and Linguistics', 1),
  ('dept-ims-ms',    'col-ims',   'MS',      'Marine Sciences', 'Oceanography and Marine Sciences', 1),
  ('dept-sjmc-jmc',  'col-sjmc',  'JMC',     'Journalism and Mass Communication', 'Journalism, Mass Communication and Public Relations', 1),
  ('dept-soaf-asft', 'col-soaf',  'ASFT',    'Aquatic Sciences and Fisheries Technology', 'Aquatic Sciences and Fisheries Technology', 1),
  ('dept-mri-eem',   'col-mri',   'EEM',     'Environmental Engineering and Management', 'Environmental Engineering and Management in Mines', 1),
  ('dept-mri-gme',   'col-mri',   'GME',     'Geology and Mineral Exploration', 'Geology and Mineral Exploration', 1),
  ('dept-mri-lms',   'col-mri',   'LMS',     'Land and Mine Surveying', 'Land and Mine Surveying', 1),
  ('dept-mri-me',    'col-mri',   'ME',      'Mining Engineering', 'Mining Engineering and Mineral Extraction', 1),
  ('dept-mri-pge',   'col-mri',   'PGE',     'Petroleum Geosciences and Exploration', 'Petroleum Geosciences and Exploration', 1)
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`,
  `description` = `new_row`.`description`,
  `is_active` = `new_row`.`is_active`;

INSERT INTO `ref_departments` (`id`, `college_id`, `code`, `name`) VALUES
  ('dept-conas-nas', 'col-conas', 'NAS',     'Natural and Applied Sciences'),
  ('dept-coss-is',   'col-coss',  'IS-SS',   'Information Studies'),
  ('dept-coss-ss',   'col-coss',  'SS',      'Social Sciences'),
  ('dept-udse-econ', 'col-udse',  'ECON-SE', 'Economics'),
  ('dept-ids-ds',    'col-ids',   'DS',      'Development Studies'),
  ('dept-iks-kis',   'col-iks',   'KIS',     'Kiswahili'),
  ('dept-ims-ms',    'col-ims',   'MS',      'Marine Sciences'),
  ('dept-sjmc-jmc',  'col-sjmc',  'JMC',     'Journalism and Mass Communication'),
  ('dept-soaf-asft', 'col-soaf',  'ASFT',    'Aquatic Sciences and Fisheries Technology'),
  ('dept-mri-eem',   'col-mri',   'EEM',     'Environmental Engineering and Management'),
  ('dept-mri-gme',   'col-mri',   'GME',     'Geology and Mineral Exploration'),
  ('dept-mri-lms',   'col-mri',   'LMS',     'Land and Mine Surveying'),
  ('dept-mri-me',    'col-mri',   'ME',      'Mining Engineering'),
  ('dept-mri-pge',   'col-mri',   'PGE',     'Petroleum Geosciences and Exploration')
AS `new_row`
ON DUPLICATE KEY UPDATE
  `name` = `new_row`.`name`,
  `code` = `new_row`.`code`,
  `college_id` = `new_row`.`college_id`;

COMMIT;
