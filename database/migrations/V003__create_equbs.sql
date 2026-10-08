-- =============================================================================
-- V003 — Create equbs table
-- An equb is a rotating savings group.  An organizer creates the equb,
-- members join via invite_code, and the system manages cycles & payouts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS equbs (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200)   NOT NULL,
    description         TEXT,

    -- Ownership
    organizer_id        UUID           NOT NULL
                        REFERENCES users (id) ON DELETE RESTRICT,

    -- Financial rules
    contribution_amount NUMERIC(12, 2) NOT NULL
                        CHECK (contribution_amount > 0),
    max_members         INTEGER        NOT NULL
                        CHECK (max_members >= 2 AND max_members <= 500),
    frequency           VARCHAR(20)    NOT NULL
                        CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),

    -- Scheduling
    start_date          DATE           NOT NULL,
    end_date            DATE,           -- calculated, or NULL until started

    -- State machine
    -- open       → group is open for new members
    -- active     → all positions filled, cycles have started
    -- completed  → all cycles paid out
    -- cancelled  → organizer or admin cancelled
    status              VARCHAR(20)    NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'active', 'completed', 'cancelled')),
    current_cycle       INTEGER        NOT NULL DEFAULT 0,

    -- Joining
    invite_code         VARCHAR(12)    NOT NULL UNIQUE,

    -- Optional cover image for the group
    cover_image_url     TEXT,

    -- Late-payment penalty (% of contribution amount, 0 = no penalty)
    late_penalty_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
                         CHECK (late_penalty_percent >= 0 AND late_penalty_percent <= 100),

    -- Audit
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equbs_organizer   ON equbs (organizer_id);
CREATE INDEX IF NOT EXISTS idx_equbs_status      ON equbs (status);
CREATE INDEX IF NOT EXISTS idx_equbs_invite      ON equbs (invite_code);
CREATE INDEX IF NOT EXISTS idx_equbs_start_date  ON equbs (start_date);

DROP TRIGGER IF EXISTS trg_equbs_updated_at ON equbs;
CREATE TRIGGER trg_equbs_updated_at
    BEFORE UPDATE ON equbs
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

INSERT INTO schema_migrations (version, description)
VALUES ('V003', 'Create equbs table')
ON CONFLICT (version) DO NOTHING;
