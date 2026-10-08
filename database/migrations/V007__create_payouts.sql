-- =============================================================================
-- V007 — Create payouts table
-- Records the lump-sum disbursement to the cycle's recipient member.
-- One payout per cycle (enforced via UNIQUE on cycle_id).
-- =============================================================================

CREATE TABLE IF NOT EXISTS payouts (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Context — one payout per cycle
    cycle_id         UUID           NOT NULL UNIQUE REFERENCES cycles  (id) ON DELETE CASCADE,
    member_id        UUID           NOT NULL        REFERENCES members (id) ON DELETE CASCADE,

    -- Financials
    amount           NUMERIC(14, 2) NOT NULL CHECK (amount > 0),

    -- Disbursement channel
    payment_method   VARCHAR(30)    NOT NULL DEFAULT 'cash'
                     CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'telebirr', 'cbe_birr', 'other')),
    reference_code   VARCHAR(64),   -- transaction ID from bank / mobile-money

    -- Recipient bank / wallet details (snapshot at time of payout)
    recipient_account_name   VARCHAR(150),
    recipient_account_number VARCHAR(50),
    recipient_bank_name      VARCHAR(100),

    -- State machine
    -- pending    → collection complete; payout not yet sent
    -- processing → transfer initiated
    -- completed  → confirmed received
    -- failed     → transfer failed; retry needed
    -- disputed   → recipient disputes the amount
    status           VARCHAR(20)    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'disputed')),

    -- Timing
    paid_at          TIMESTAMPTZ,        -- when money was actually sent
    confirmed_at     TIMESTAMPTZ,        -- when receipt confirmed

    -- Who processed this payout
    processed_by     UUID           REFERENCES users (id) ON DELETE SET NULL,

    -- Evidence
    receipt_url      TEXT,

    -- Free-text memo
    notes            TEXT,

    -- Audit
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_member    ON payouts (member_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status    ON payouts (status);
CREATE INDEX IF NOT EXISTS idx_payouts_paid_at   ON payouts (paid_at);

DROP TRIGGER IF EXISTS trg_payouts_updated_at ON payouts;
CREATE TRIGGER trg_payouts_updated_at
    BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

INSERT INTO schema_migrations (version, description)
VALUES ('V007', 'Create payouts table')
ON CONFLICT (version) DO NOTHING;
