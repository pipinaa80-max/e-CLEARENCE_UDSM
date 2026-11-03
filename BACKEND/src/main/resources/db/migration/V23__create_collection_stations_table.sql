-- Flyway Migration V23: Collection Stations / Pickup Hubs Schema & Seeding

CREATE TABLE IF NOT EXISTS collection_stations (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    address TEXT NOT NULL,
    operating_hours VARCHAR(255) DEFAULT 'Mon - Fri: 08:00 - 16:00',
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stations_region ON collection_stations (region);
CREATE INDEX IF NOT EXISTS idx_stations_is_active ON collection_stations (is_active);

-- Seed Primary UDSM Collection Stations / Regional Pick-up Hubs
INSERT INTO collection_stations (id, code, name, region, district, address, operating_hours, contact_phone, contact_email, is_active)
VALUES
  ('stn-udsm-main', 'UDSM-MAIN', 'UDSM Main Campus - DUS Central Station', 'Dar es Salaam', 'Ubunifu / Kinondoni', 'DUS Building Room 102, Main Campus', 'Mon - Fri: 08:00 - 16:00', '+255 22 2410500', 'dus.collection@udsm.ac.tz', TRUE),
  ('stn-coict-kijito', 'COICT-HUB', 'CoICT Kijitonyama Dispatch Center', 'Dar es Salaam', 'Kijitonyama', 'CoICT Block A Ground Floor, Kijitonyama Campus', 'Mon - Fri: 08:00 - 16:00', '+255 22 2700010', 'coict.collection@udsm.ac.tz', TRUE),
  ('stn-arusha-hub', 'ARUSHA-HUB', 'UDSM Arusha Regional Collection Station', 'Arusha', 'Arusha Urban', 'UDSM Extension Center, Clocktower Street', 'Mon - Fri: 08:30 - 16:30', '+255 27 2548890', 'arusha.center@udsm.ac.tz', TRUE),
  ('stn-mwanza-hub', 'MWANZA-HUB', 'UDSM Mwanza Regional Collection Station', 'Mwanza', 'Nyamagana', 'UDSM Lake Zone Center, Station Road', 'Mon - Fri: 08:30 - 16:30', '+255 28 2500411', 'mwanza.center@udsm.ac.tz', TRUE),
  ('stn-mbeya-hub', 'MBEYA-HUB', 'UDSM Mbeya Regional Collection Station', 'Mbeya', 'Mbeya City', 'UDSM Southern Highlands Bureau, Posta Street', 'Mon - Fri: 08:30 - 16:30', '+255 25 2502200', 'mbeya.center@udsm.ac.tz', TRUE),
  ('stn-dodoma-hub', 'DODOMA-HUB', 'UDSM Capital Dodoma Collection Bureau', 'Dodoma', 'Dodoma Urban', 'Government City Sub-Bureau, Block B', 'Mon - Fri: 08:00 - 16:00', '+255 26 2321100', 'dodoma.center@udsm.ac.tz', TRUE)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, address = EXCLUDED.address, operating_hours = EXCLUDED.operating_hours;
