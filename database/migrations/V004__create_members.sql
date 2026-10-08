-- =============================================================================
-- V004 — Create members table
-- Junction between users and equbs.  Each row represents one membership slot.
-- payout_position determines who receives the pot first.
-- =============================================================================

CREATE TABLE IF NOT EXISTS members (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    equb_id          UUID        NOT NULL REFERENCES equbs  (id) ON DELETE CASCADE,
    user_id          UUID        NOT NULL REFERENCES users  (id) ON DELETE CASCADE,

    -- Position in the payout queue (1-based)
    payout_position  INTEGER     NOT NULL CHECK (payout_position >= 1),

    -- Whether this member has already received their payout cycle
    has_received     BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Membership state
    -- active    → currently participating
    -- left      → voluntarily withdrew
    -- removed   → expelled by organizer
    -- defaulted → missed too many contributions
    status           VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'left', 'removed', 'defaulted')),

    -- Optional guarantor (another user who vouches for this member)
    guarantor_id     UUID        REFERENCES users (id) ON DELETE SET NULL,

    -- Audit
    joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints — one user per equb, one slot per position
    UNIQUE (equb_id, user_id),
    UNIQUE (equb_id, payout_position)
);

CREATE INDEX IF NOT EXISTS idx_members_equb    ON members (equb_id);
CREATE INDEX IF NOT EXISTS idx_members_user    ON members (user_id);
CREATE INDEX IF NOT EXISTS idx_members_status  ON members (status);

DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

INSERT INTO schema_migrations (version, description)
VALUES ('V004', 'Create members table')
ON CONFLICT (version) DO NOTHING;
