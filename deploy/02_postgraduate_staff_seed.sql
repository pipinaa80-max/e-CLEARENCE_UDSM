-- ============================================================================
-- UDSM e-Clearance & Transcript MIS — Standalone Postgraduate Staff Seed
-- ============================================================================
-- Purpose        : Seeds ONLY institutional Postgraduate staff accounts
--                  (Directorate of Postgraduate Studies + Research Supervisors
--                  across all 20 UDSM Colleges, Schools & Constituent Colleges).
--                  Intentionally creates ZERO fake/unnecessary student accounts;
--                  real Postgraduate students should be imported via Admin ->
--                  Data Upload (Excel/CSV with Award column) or ARIS 3 export.
-- Total Accounts : 22 Postgraduate Staff (2 DPGS Directors + 20 College Supervisors)
-- Default Pass   : Clearance@2026! (BCrypt 10 rounds — rotate after first login)
-- Target Engine  : MySQL 8.0.19+ (uses VALUES (...) AS new_row)
-- Idempotency    : Safe to run standalone or after deploy/udsm_users_seed.sql
-- ============================================================================

SET NAMES utf8mb4;
SET TIME_ZONE = '+00:00';
START TRANSACTION;

INSERT INTO `users` (
  `id`,
  `username`,
  `email`,
  `password`,
  `full_name`,
  `first_name`,
  `middle_name`,
  `last_name`,
  `registration_number`,
  `programme`,
  `college`,
  `department`,
  `academic_year`,
  `graduation_year`,
  `year_of_study`,
  `phone_number`,
  `role`,
  `is_active`,
  `is_email_verified`,
  `is_locked`,
  `institutional_domain`,
  `created_by`,
  `created_at`,
  `updated_at`
) VALUES
  -- Directorate of Postgraduate Studies (DPGS)
  ('5279407a-1214-4ca7-a29d-ae0b22c01d3b', 'dpgs@udsm.ac.tz',            'dpgs@udsm.ac.tz',            '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Director of Postgraduate Studies',        'Director',   'Postgraduate', 'Studies',        'STF-DPG-001',       NULL, NULL,    'Directorate of Postgraduate Studies', NULL, NULL, '2026', NULL, 'DIRECTOR_OF_POSTGRADUATE_STUDIES', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('9a1e4c21-6f5b-4a38-91d2-77c3b8e41002', 'dpgs.deputy@udsm.ac.tz',     'dpgs.deputy@udsm.ac.tz',     '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Deputy Director of Postgraduate Studies', 'Deputy',     'Postgraduate', 'Director',       'STF-DPG-002',       NULL, NULL,    'Directorate of Postgraduate Studies', NULL, NULL, '2026', NULL, 'DIRECTOR_OF_POSTGRADUATE_STUDIES', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),

  -- Research Supervisors — All 20 UDSM Colleges, Schools, Institutes & Constituent Colleges
  -- (department = NULL allows each college supervisor to oversee all departments in their college)
  ('d9c4b720-a52a-4baa-974f-a77dc33fd47e', 'supervisor.coaf@udsm.ac.tz',  'supervisor.coaf@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — CoAF',              'Supervisor', 'of',           'CoAF',           'STF-SUP-COAF-001',  NULL, 'CoAF',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('415fc278-433e-4e73-aa05-87f63a0d2084', 'supervisor.coet@udsm.ac.tz',  'supervisor.coet@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — CoET',              'Supervisor', 'of',           'CoET',           'STF-SUP-COET-002',  NULL, 'CoET',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('2350841d-9dde-471c-8bb0-cb17f92519dd', 'supervisor.cohu@udsm.ac.tz',  'supervisor.cohu@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — CoHU',              'Supervisor', 'of',           'CoHU',           'STF-SUP-COHU-003',  NULL, 'CoHU',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('50fd2504-fdf2-42d2-ba6d-447140f7fa67', 'supervisor.coict@udsm.ac.tz', 'supervisor.coict@udsm.ac.tz', '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — CoICT',             'Supervisor', 'of',           'CoICT',          'STF-SUP-COICT-004', NULL, 'CoICT', NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('9c4375af-12d2-4721-ac2e-1f8060db72e6', 'supervisor.conas@udsm.ac.tz', 'supervisor.conas@udsm.ac.tz', '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — CoNAS',             'Supervisor', 'of',           'CoNAS',          'STF-SUP-CONAS-005', NULL, 'CoNAS', NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('f2fab58b-861e-47bd-98dd-078884b1363c', 'supervisor.coss@udsm.ac.tz',  'supervisor.coss@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — CoSS',              'Supervisor', 'of',           'CoSS',           'STF-SUP-COSS-006',  NULL, 'CoSS',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('52475ca8-38ef-459a-b4a8-5d633d545588', 'supervisor.ids@udsm.ac.tz',   'supervisor.ids@udsm.ac.tz',   '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — IDS',               'Supervisor', 'of',           'IDS',            'STF-SUP-IDS-007',   NULL, 'IDS',   NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('aba0ba1d-97f2-4fac-8595-f71fbd546364', 'supervisor.iks@udsm.ac.tz',   'supervisor.iks@udsm.ac.tz',   '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — IKS',               'Supervisor', 'of',           'IKS',            'STF-SUP-IKS-008',   NULL, 'IKS',   NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('195223ae-150d-4b7b-b42a-6223ad10b2c1', 'supervisor.ims@udsm.ac.tz',   'supervisor.ims@udsm.ac.tz',   '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — IMS',               'Supervisor', 'of',           'IMS',            'STF-SUP-IMS-009',   NULL, 'IMS',   NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('8ffc9e02-ba0a-404d-9fb0-9f2feadb1be9', 'supervisor.mchas@udsm.ac.tz', 'supervisor.mchas@udsm.ac.tz', '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — MCHAS',             'Supervisor', 'of',           'MCHAS',          'STF-SUP-MCHAS-010', NULL, 'MCHAS', NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('b669b59f-35d8-40eb-ae04-58e09061bb10', 'supervisor.mri@udsm.ac.tz',   'supervisor.mri@udsm.ac.tz',   '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — MRI',               'Supervisor', 'of',           'MRI',            'STF-SUP-MRI-011',   NULL, 'MRI',   NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('1f7c92ac-15ef-4341-86f1-1ad73afc4d6c', 'supervisor.sjmc@udsm.ac.tz',  'supervisor.sjmc@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — SJMC',              'Supervisor', 'of',           'SJMC',           'STF-SUP-SJMC-012',  NULL, 'SJMC',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('f71c01c9-0a78-425e-a285-3689ee3d22f0', 'supervisor.soaf@udsm.ac.tz',  'supervisor.soaf@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — SoAF',              'Supervisor', 'of',           'SoAF',           'STF-SUP-SOAF-013',  NULL, 'SoAF',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('47fed2a6-1937-430a-8c8d-f64a2ce456a1', 'supervisor.soed@udsm.ac.tz',  'supervisor.soed@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — SoED',              'Supervisor', 'of',           'SoED',           'STF-SUP-SOED-014',  NULL, 'SoED',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('bccb7895-52e8-4ef6-9ce2-8eaf75394bef', 'supervisor.somg@udsm.ac.tz',  'supervisor.somg@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — SoMG',              'Supervisor', 'of',           'SoMG',           'STF-SUP-SOMG-015',  NULL, 'SoMG',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('a8d8509e-5442-4199-8e20-bf2ef8b3b595', 'supervisor.udbs@udsm.ac.tz',  'supervisor.udbs@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — UDBS',              'Supervisor', 'of',           'UDBS',           'STF-SUP-UDBS-016',  NULL, 'UDBS',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('947416aa-0f24-470e-a56d-e7829b621714', 'supervisor.udse@udsm.ac.tz',  'supervisor.udse@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — UDSE',              'Supervisor', 'of',           'UDSE',           'STF-SUP-UDSE-017',  NULL, 'UDSE',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('511daaeb-765b-494b-a11b-d600d8e26b16', 'supervisor.udsol@udsm.ac.tz', 'supervisor.udsol@udsm.ac.tz', '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — UDSoL',             'Supervisor', 'of',           'UDSoL',          'STF-SUP-UDSOL-018', NULL, 'UDSoL', NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('7e4d12a9-93c1-4b5e-8a62-119b2c7d4019', 'supervisor.duce@udsm.ac.tz',  'supervisor.duce@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — DUCE',              'Supervisor', 'of',           'DUCE',           'STF-SUP-DUCE-019',  NULL, 'DUCE',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6)),
  ('c38f54b2-21a8-4d91-9e04-55d8e2f63020', 'supervisor.muce@udsm.ac.tz',  'supervisor.muce@udsm.ac.tz',  '$2a$10$Se9qGtZ78.D.uT2GVAjBdeeQx.0RMLQBJs.rDGZAuUBvkSTGgZrz2', 'Research Supervisor — MUCE',              'Supervisor', 'of',           'MUCE',           'STF-SUP-MUCE-020',  NULL, 'MUCE',  NULL, NULL, NULL, '2026', NULL, 'SUPERVISOR', 1, 1, 0, 'udsm.ac.tz', 'PG_STAFF_SEED', NOW(6), NOW(6))
AS `new_row`
ON DUPLICATE KEY UPDATE
  `full_name` = `new_row`.`full_name`,
  `college` = `new_row`.`college`,
  `department` = `new_row`.`department`,
  `role` = `new_row`.`role`,
  `is_active` = `new_row`.`is_active`,
  `updated_at` = NOW(6);

COMMIT;
