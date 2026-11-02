ALTER TABLE users ADD COLUMN IF NOT EXISTS institutional_domain VARCHAR(253);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_institutional_domain
    ON users (LOWER(institutional_domain))
    WHERE institutional_domain IS NOT NULL AND institutional_domain <> '';
