-- =============================================================================
-- V006 — Create contributions table
-- Records each member's individual payment within a cycle.
-- One row per (cycle, member) — enforced via UNIQUE constraint.
-- =============================================================================

CREATE TABLE IF NOT EXISTS contributions (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Context
    cycle_id         UUID           NOT NULL REFERENCES cycles  (id) ON DELETE CASCADE,
    member_id        UUID           NOT NULL REFERENCES members (id) ON DELETE CASCADE,

    -- Amount due vs. amount paid (may differ if partial or overpaid)
    amount_due       NUMERIC(12, 2) NOT NULL CHECK (amount_due > 0),
    amount_paid      NUMERIC(12, 2)           CHECK (amount_paid > 0),

    -- Payment details
    payment_method   VARCHAR(30)    NOT NULL DEFAULT 'cash'
                     CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'telebirr', 'cbe_birr', 'other')),
    reference_code   VARCHAR(64),   -- bank/mobile-money transaction ID

    -- State machine
    -- pending    → contribution entry created, awaiting payment
    -- submitted  → member claims they paid (awaiting organizer confirmation)
    -- confirmed  → organizer/admin verified
    -- rejected   → evidence rejected; member must resubmit
    -- waived     → organizer forgave this contribution
    -- refunded   → returned to member (e.g., equb cancelled)
    status           VARCHAR(20)    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'submitted', 'confirmed', 'rejected', 'waived', 'refunded')),

    -- Timing
    paid_at          TIMESTAMPTZ,   -- when the physical/digital payment happened
    confirmed_at     TIMESTAMPTZ,   -- when organizer confirmed

    -- Who approved / rejected
    confirmed_by     UUID           REFERENCES users (id) ON DELETE SET NULL,

    -- Evidence (receipt photo URL, etc.)
    receipt_url      TEXT,

    -- Late fee applied (0 if none)
    late_fee         NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (late_fee >= 0),

    -- Free-text memo
    notes            TEXT,

    -- Audit
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- One contribution record per member per cycle
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

INSERT INTO schema_migrations (version, description)
VALUES ('V006', 'Create contributions table')
ON CONFLICT (version) DO NOTHING;
