-- =============================================================================
-- V005 — Create cycles table
-- One cycle = one collection + one payout round.
-- cycle_number is sequential within an equb (1, 2, 3 …).
-- recipient_id is the member who receives the pot for this cycle.
-- =============================================================================

CREATE TABLE IF NOT EXISTS cycles (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent group
    equb_id          UUID           NOT NULL REFERENCES equbs    (id) ON DELETE CASCADE,

    -- Who receives the pot in this cycle
    recipient_id     UUID           REFERENCES members (id) ON DELETE SET NULL,

    -- Position within this equb's lifetime
    cycle_number     INTEGER        NOT NULL CHECK (cycle_number >= 1),

    -- Key dates
    due_date         DATE           NOT NULL,     -- deadline for all contributions
    started_at       TIMESTAMPTZ,                 -- when collection actually began
    completed_at     TIMESTAMPTZ,                 -- when payout was confirmed

    -- State machine
    -- pending     → not yet started
    -- collecting  → active, accepting contributions
    -- completed   → all contributions received, payout issued
    -- overdue     → due_date passed with missing contributions
    -- cancelled   → cycle was voided (e.g., equb cancelled)
    status           VARCHAR(20)    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'collecting', 'completed', 'overdue', 'cancelled')),

    -- Financials (updated in real time as contributions land)
    total_collected  NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_collected >= 0),
    expected_total   NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (expected_total >= 0),

    -- Organizer note / reason for any override
    notes            TEXT,

    -- Audit
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    UNIQUE (equb_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_cycles_equb        ON cycles (equb_id);
CREATE INDEX IF NOT EXISTS idx_cycles_status      ON cycles (status);
CREATE INDEX IF NOT EXISTS idx_cycles_due_date    ON cycles (due_date);
CREATE INDEX IF NOT EXISTS idx_cycles_recipient   ON cycles (recipient_id);

DROP TRIGGER IF EXISTS trg_cycles_updated_at ON cycles;
CREATE TRIGGER trg_cycles_updated_at
    BEFORE UPDATE ON cycles
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

INSERT INTO schema_migrations (version, description)
VALUES ('V005', 'Create cycles table')
ON CONFLICT (version) DO NOTHING;
