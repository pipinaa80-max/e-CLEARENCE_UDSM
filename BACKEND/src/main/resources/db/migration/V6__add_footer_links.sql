ALTER TABLE project_settings ADD COLUMN IF NOT EXISTS footer_links_json TEXT DEFAULT '[]';
