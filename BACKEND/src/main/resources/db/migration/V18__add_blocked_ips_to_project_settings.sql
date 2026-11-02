ALTER TABLE project_settings ADD COLUMN IF NOT EXISTS blocked_ips_json TEXT DEFAULT '[]';
