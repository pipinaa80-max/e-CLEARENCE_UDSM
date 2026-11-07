-- Flyway Migration V27: Add Station Assignment Fields to Users

ALTER TABLE users
ADD COLUMN IF NOT EXISTS station_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS station_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_station_code ON users (station_code);
