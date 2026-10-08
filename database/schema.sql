-- =============================================================================
-- Ethiopian Digital Equb Management System — Master Schema
-- PostgreSQL 14+
--
-- Tables:
--   schema_migrations, users, equbs, members, cycles,
--   contributions, payouts, notifications
--
-- Apply with:   npm run migrate   (backend)
--               psql -f database/schema.sql   (direct)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Migration tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(10)  PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Shared trigger: auto-update updated_at column
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- USERS
-- ===========================================================================
CREATE TABLE IF NOT EXISTS users (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name         VARCHAR(150) NOT NULL,
    phone             VARCHAR(20)  NOT NULL UNIQUE,
    email             VARCHAR(150) UNIQUE,
    password_hash     TEXT         NOT NULL,

    -- Access control
    role              VARCHAR(20)  NOT NULL DEFAULT 'member'
                      CHECK (role IN ('member', 'organizer', 'admin')),

    -- Localisation (en=English, am=Amharic, om=Afaan Oromoo)
    language          VARCHAR(10)  NOT NULL DEFAULT 'en'
                      CHECK (language IN ('en', 'am', 'om')),

    -- Push notifications
    fcm_token         TEXT,

    -- Profile
    profile_photo_url TEXT,
    national_id       VARCHAR(50),

    -- Account state
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    is_verified       BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at     TIMESTAMPTZ,

    -- Audit
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone     ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ===========================================================================
-- EQUBS  (rotating savings groups)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS equbs (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(200)   NOT NULL,
    description          TEXT,

    -- Ownership
    organizer_id         UUID           NOT NULL
                         REFERENCES users (id) ON DELETE RESTRICT,

    -- Financial rules
    contribution_amount  NUMERIC(12, 2) NOT NULL CHECK (contribution_amount > 0),
    max_members          INTEGER        NOT NULL CHECK (max_members >= 2 AND max_members <= 500),
    frequency            VARCHAR(20)    NOT NULL
                         CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),

    -- Scheduling
    start_date           DATE           NOT NULL,
    end_date             DATE,

    -- State machine: open → active → completed | cancelled
    status               VARCHAR(20)    NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'active', 'completed', 'cancelled')),
    current_cycle        INTEGER        NOT NULL DEFAULT 0,

    -- Joining
    invite_code          VARCHAR(12)    NOT NULL UNIQUE,
    cover_image_url      TEXT,

    -- Late-payment penalty (percentage of contribution_amount)
    late_penalty_percent NUMERIC(5, 2)  NOT NULL DEFAULT 0
                         CHECK (late_penalty_percent >= 0 AND late_penalty_percent <= 100),

    -- Audit
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equbs_organizer  ON equbs (organizer_id);
CREATE INDEX IF NOT EXISTS idx_equbs_status     ON equbs (status);
CREATE INDEX IF NOT EXISTS idx_equbs_invite     ON equbs (invite_code);
CREATE INDEX IF NOT EXISTS idx_equbs_start_date ON equbs (start_date);

DROP TRIGGER IF EXISTS trg_equbs_updated_at ON equbs;
CREATE TRIGGER trg_equbs_updated_at
    BEFORE UPDATE ON equbs
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ===========================================================================
-- MEMBERS  (user ↔ equb junction)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS members (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    equb_id          UUID        NOT NULL REFERENCES equbs (id) ON DELETE CASCADE,
    user_id          UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    -- Position in the payout queue (1-based; lower = paid out sooner)
    payout_position  INTEGER     NOT NULL CHECK (payout_position >= 1),
    has_received     BOOLEAN     NOT NULL DEFAULT FALSE,

    -- State machine: active → left | removed | defaulted
    status           VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'left', 'removed', 'defaulted')),

    -- Optional guarantor
    guarantor_id     UUID        REFERENCES users (id) ON DELETE SET NULL,

    -- Audit
    joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Uniqueness constraints
    UNIQUE (equb_id, user_id),
    UNIQUE (equb_id, payout_position)
);

CREATE INDEX IF NOT EXISTS idx_members_equb   ON members (equb_id);
CREATE INDEX IF NOT EXISTS idx_members_user   ON members (user_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members (status);

DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ===========================================================================
-- CYCLES  (each collection + payout round)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS cycles (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    equb_id          UUID           NOT NULL REFERENCES equbs    (id) ON DELETE CASCADE,
    recipient_id     UUID           REFERENCES members (id) ON DELETE SET NULL,

    cycle_number     INTEGER        NOT NULL CHECK (cycle_number >= 1),
    due_date         DATE           NOT NULL,

    -- State machine: pending → collecting → completed | overdue | cancelled
    status           VARCHAR(20)    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'collecting', 'completed', 'overdue', 'cancelled')),

    -- Running totals
    total_collected  NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_collected >= 0),
    expected_total   NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (expected_total >= 0),

    -- Timestamps
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,

    notes            TEXT,

    -- Audit
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    UNIQUE (equb_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_cycles_equb      ON cycles (equb_id);
CREATE INDEX IF NOT EXISTS idx_cycles_status    ON cycles (status);
CREATE INDEX IF NOT EXISTS idx_cycles_due_date  ON cycles (due_date);
CREATE INDEX IF NOT EXISTS idx_cycles_recipient ON cycles (recipient_id);

DROP TRIGGER IF EXISTS trg_cycles_updated_at ON cycles;
CREATE TRIGGER trg_cycles_updated_at
    BEFORE UPDATE ON cycles
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ===========================================================================
-- CONTRIBUTIONS  (individual member payments within a cycle)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS contributions (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id         UUID           NOT NULL REFERENCES cycles  (id) ON DELETE CASCADE,
    member_id        UUID           NOT NULL REFERENCES members (id) ON DELETE CASCADE,

    -- Amounts
    amount_due       NUMERIC(12, 2) NOT NULL CHECK (amount_due > 0),
    amount_paid      NUMERIC(12, 2)           CHECK (amount_paid > 0),

    -- Payment details
    payment_method   VARCHAR(30)    NOT NULL DEFAULT 'cash'
                     CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'telebirr', 'cbe_birr', 'other')),
    reference_code   VARCHAR(64),

    -- State machine: pending → submitted → confirmed | rejected | waived | refunded
    status           VARCHAR(20)    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'submitted', 'confirmed', 'rejected', 'waived', 'refunded')),

    -- Timing & approval
    paid_at          TIMESTAMPTZ,
    confirmed_at     TIMESTAMPTZ,
    confirmed_by     UUID           REFERENCES users (id) ON DELETE SET NULL,

    -- Evidence & extras
    receipt_url      TEXT,
    late_fee         NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (late_fee >= 0),
    notes            TEXT,

    -- Audit
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    UNIQUE (cycle_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_contributions_cycle   ON contributions (cycle_id);
CREATE INDEX IF NOT EXISTS idx_contributions_member  ON contributions (member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status  ON contributions (status);
CREATE INDEX IF NOT EXISTS idx_contributions_paid_at ON contributions (paid_at);

DROP TRIGGER IF EXISTS trg_contributions_updated_at ON contributions;
CREATE TRIGGER trg_contributions_updated_at
    BEFORE UPDATE ON contributions
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ===========================================================================
-- PAYOUTS  (lump-sum disbursement to the cycle recipient)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS payouts (
    id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id                 UUID           NOT NULL UNIQUE REFERENCES cycles  (id) ON DELETE CASCADE,
    member_id                UUID           NOT NULL        REFERENCES members (id) ON DELETE CASCADE,

    amount                   NUMERIC(14, 2) NOT NULL CHECK (amount > 0),

    payment_method           VARCHAR(30)    NOT NULL DEFAULT 'cash'
                             CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'telebirr', 'cbe_birr', 'other')),
    reference_code           VARCHAR(64),

    -- Recipient account snapshot
    recipient_account_name   VARCHAR(150),
    recipient_account_number VARCHAR(50),
    recipient_bank_name      VARCHAR(100),

    -- State machine: pending → processing → completed | failed | disputed
    status                   VARCHAR(20)    NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'disputed')),

    paid_at                  TIMESTAMPTZ,
    confirmed_at             TIMESTAMPTZ,
    processed_by             UUID           REFERENCES users (id) ON DELETE SET NULL,

    receipt_url              TEXT,
    notes                    TEXT,

    -- Audit
    created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_member  ON payouts (member_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status  ON payouts (status);
CREATE INDEX IF NOT EXISTS idx_payouts_paid_at ON payouts (paid_at);

DROP TRIGGER IF EXISTS trg_payouts_updated_at ON payouts;
CREATE TRIGGER trg_payouts_updated_at
    BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ===========================================================================
-- NOTIFICATIONS  (in-app, push FCM, and SMS messages)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target user
    user_id          UUID         NOT NULL REFERENCES users  (id) ON DELETE CASCADE,

    -- Optional context for deep-linking
    equb_id          UUID         REFERENCES equbs   (id) ON DELETE SET NULL,
    cycle_id         UUID         REFERENCES cycles  (id) ON DELETE SET NULL,

    -- Content
    title            VARCHAR(200) NOT NULL,
    body             TEXT         NOT NULL,

    type             VARCHAR(40)  NOT NULL
                     CHECK (type IN (
                         'contribution_due',
                         'contribution_submitted',
                         'contribution_confirmed',
                         'contribution_rejected',
                         'payout_ready',
                         'payout_completed',
                         'payout_failed',
                         'equb_invite',
                         'equb_started',
                         'equb_completed',
                         'equb_cancelled',
                         'cycle_started',
                         'cycle_overdue',
                         'member_left',
                         'member_removed',
                         'general',
                         'admin'
                     )),

    channel          VARCHAR(20)  NOT NULL DEFAULT 'push'
                     CHECK (channel IN ('push', 'sms', 'both', 'in_app')),

    -- In-app read state
    is_read          BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at          TIMESTAMPTZ,

    -- Push (FCM) delivery
    push_status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                     CHECK (push_status IN ('pending', 'sent', 'failed', 'skipped')),
    push_sent_at     TIMESTAMPTZ,
    push_error       TEXT,

    -- SMS delivery
    sms_status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                     CHECK (sms_status IN ('pending', 'sent', 'failed', 'skipped')),
    sms_sent_at      TIMESTAMPTZ,
    sms_error        TEXT,

    -- Arbitrary extras (deep_link, image_url, action buttons…)
    metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,

    -- Scheduled delivery (NULL = send immediately)
    scheduled_at     TIMESTAMPTZ,

    -- Audit (no updated_at — notifications are immutable once sent)
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user       ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread     ON notifications (user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_type       ON notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_equb       ON notifications (equb_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled  ON notifications (scheduled_at) WHERE scheduled_at IS NOT NULL;
