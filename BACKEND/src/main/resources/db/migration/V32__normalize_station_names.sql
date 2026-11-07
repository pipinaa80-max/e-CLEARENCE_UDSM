-- Normalize and clean collection station names and codes to uppercase UDSM
UPDATE collection_stations
SET name = 'UDSM Main Campus - DUS Central Station',
    code = 'UDSM-MAIN'
WHERE LOWER(code) = 'udsm-main' OR LOWER(name) LIKE '%main campus%';

UPDATE users
SET station_code = 'UDSM-MAIN',
    station_name = 'UDSM Main Campus - DUS Central Station'
WHERE LOWER(station_code) = 'udsm-main';
