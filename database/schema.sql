-- =============================================================================
-- Ethiopian Digital Equb Management System — PostgreSQL Schema
-- Tables: Users, Equbs, Members, Cycles, Contributions, Payouts, Notifications
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20)  NOT NULL UNIQUE,
    email           VARCHAR(150) UNIQUE,
    password_hash   TEXT         NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'member'
                    CHECK (role IN ('member', 'organizer', 'admin')),
    language        VARCHAR(10)  NOT NULL DEFAULT 'en'
                    CHECK (language IN ('en', 'am', 'om')),
    fcm_token       TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users (phone);
CREATE INDEX idx_users_role  ON users (role);

-- ---------------------------------------------------------------------------
-- Equbs (rotating savings groups)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equbs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(200) NOT NULL,
    description       TEXT,
    organizer_id      UUID         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    contribution_amount NUMERIC(12, 2) NOT NULL CHECK (contribution_amount > 0),
    max_members       INTEGER      NOT NULL CHECK (max_members >= 2),
    frequency         VARCHAR(20)  NOT NULL
                      CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
    start_date        DATE         NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'active', 'completed', 'cancelled')),
    current_cycle     INTEGER      NOT NULL DEFAULT 0,
    invite_code       VARCHAR(12)  NOT NULL UNIQUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equbs_organizer ON equbs (organizer_id);
CREATE INDEX idx_equbs_status    ON equbs (status);
CREATE INDEX idx_equbs_invite    ON equbs (invite_code);

-- ---------------------------------------------------------------------------
-- Members (users belonging to an equb)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equb_id         UUID        NOT NULL REFERENCES equbs (id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    payout_position INTEGER     NOT NULL CHECK (payout_position >= 1),
    has_received    BOOLEAN     NOT NULL DEFAULT FALSE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'left', 'removed', 'defaulted')),
    UNIQUE (equb_id, user_id),
    UNIQUE (equb_id, payout_position)
);

CREATE INDEX idx_members_equb ON members (equb_id);
CREATE INDEX idx_members_user ON members (user_id);

-- ---------------------------------------------------------------------------
-- Cycles (each contribution/payout round)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycles (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equb_id          UUID        NOT NULL REFERENCES equbs (id) ON DELETE CASCADE,
    cycle_number     INTEGER     NOT NULL CHECK (cycle_number >= 1),
    recipient_id     UUID        REFERENCES members (id) ON DELETE SET NULL,
    due_date         DATE        NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'collecting', 'completed', 'overdue')),
    total_collected  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (equb_id, cycle_number)
);

CREATE INDEX idx_cycles_equb   ON cycles (equb_id);
CREATE INDEX idx_cycles_status ON cycles (status);

-- ---------------------------------------------------------------------------
-- Contributions (per-member payments in a cycle)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id        UUID           NOT NULL REFERENCES cycles (id) ON DELETE CASCADE,
    member_id       UUID           NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method  VARCHAR(30)    NOT NULL DEFAULT 'cash'
                    CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'other')),
    reference_code  VARCHAR(64),
    status          VARCHAR(20)    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'rejected', 'refunded')),
    paid_at         TIMESTAMPTZ,
    confirmed_by    UUID           REFERENCES users (id) ON DELETE SET NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (cycle_id, member_id)
);

CREATE INDEX idx_contributions_cycle  ON contributions (cycle_id);
CREATE INDEX idx_contributions_member ON contributions (member_id);
CREATE INDEX idx_contributions_status ON contributions (status);

-- ---------------------------------------------------------------------------
-- Payouts (lump sum received by the cycle recipient)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id        UUID           NOT NULL UNIQUE REFERENCES cycles (id) ON DELETE CASCADE,
    member_id       UUID           NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    amount          NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payment_method  VARCHAR(30)    NOT NULL DEFAULT 'cash'
                    CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'other')),
    reference_code  VARCHAR(64),
    status          VARCHAR(20)    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'failed')),
    paid_at         TIMESTAMPTZ,
    processed_by    UUID           REFERENCES users (id) ON DELETE SET NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_member ON payouts (member_id);
CREATE INDEX idx_payouts_status ON payouts (status);

-- ---------------------------------------------------------------------------
-- Notifications (in-app + delivery tracking for SMS / FCM)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    equb_id         UUID        REFERENCES equbs (id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    body            TEXT         NOT NULL,
    type            VARCHAR(40)  NOT NULL
                    CHECK (type IN (
                        'contribution_due',
                        'contribution_confirmed',
                        'payout_ready',
                        'payout_completed',
                        'equb_invite',
                        'equb_started',
                        'equb_completed',
                        'cycle_started',
                        'general',
                        'admin'
                    )),
    channel         VARCHAR(20)  NOT NULL DEFAULT 'push'
                    CHECK (channel IN ('push', 'sms', 'both', 'in_app')),
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    sms_status      VARCHAR(20)  DEFAULT 'pending'
                    CHECK (sms_status IN ('pending', 'sent', 'failed', 'skipped')),
    push_status     VARCHAR(20)  DEFAULT 'pending'
                    CHECK (push_status IN ('pending', 'sent', 'failed', 'skipped')),
    metadata        JSONB        DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_read ON notifications (user_id, is_read);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_equbs_updated_at
    BEFORE UPDATE ON equbs
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_contributions_updated_at
    BEFORE UPDATE ON contributions
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_payouts_updated_at
    BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
