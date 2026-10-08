-- =============================================================================
-- V002 — Create users table
-- Core identity record for every person using the system.
-- Roles: member | organizer | admin
-- Languages: en (English) | am (Amharic) | om (Afaan Oromoo)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Reusable updated_at trigger function (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20)  NOT NULL UNIQUE,
    email           VARCHAR(150) UNIQUE,
    password_hash   TEXT         NOT NULL,

    -- Access control
    role            VARCHAR(20)  NOT NULL DEFAULT 'member'
                    CHECK (role IN ('member', 'organizer', 'admin')),

    -- Localisation
    language        VARCHAR(10)  NOT NULL DEFAULT 'en'
                    CHECK (language IN ('en', 'am', 'om')),

    -- Push notifications
    fcm_token       TEXT,

    -- Profile extras
    profile_photo_url TEXT,
    national_id       VARCHAR(50),

    -- Account state
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,

    -- Audit
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone    ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

-- Trigger
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Migration record
INSERT INTO schema_migrations (version, description)
VALUES ('V002', 'Create users table')
ON CONFLICT (version) DO NOTHING;
