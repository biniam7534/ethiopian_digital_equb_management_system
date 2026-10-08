-- =============================================================================
-- V008 — Create notifications table
-- Tracks in-app, push (FCM), and SMS notifications.
-- metadata JSONB carries channel-specific payloads (deep-link, image URL…).
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target
    user_id          UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    -- Optional associations (for contextual deep-linking)
    equb_id          UUID          REFERENCES equbs  (id)  ON DELETE SET NULL,
    cycle_id         UUID          REFERENCES cycles (id)  ON DELETE SET NULL,

    -- Content
    title            VARCHAR(200)  NOT NULL,
    body             TEXT          NOT NULL,

    -- Category drives the icon / colour in the app
    type             VARCHAR(40)   NOT NULL
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

    -- Delivery channels
    channel          VARCHAR(20)   NOT NULL DEFAULT 'push'
                     CHECK (channel IN ('push', 'sms', 'both', 'in_app')),

    -- Read state (in-app)
    is_read          BOOLEAN       NOT NULL DEFAULT FALSE,
    read_at          TIMESTAMPTZ,

    -- Per-channel delivery statuses
    -- pending → not yet attempted | sent → dispatched | failed → error | skipped → channel disabled
    push_status      VARCHAR(20)   NOT NULL DEFAULT 'pending'
                     CHECK (push_status IN ('pending', 'sent', 'failed', 'skipped')),
    push_sent_at     TIMESTAMPTZ,
    push_error       TEXT,          -- last error message if push_status = 'failed'

    sms_status       VARCHAR(20)   NOT NULL DEFAULT 'pending'
                     CHECK (sms_status IN ('pending', 'sent', 'failed', 'skipped')),
    sms_sent_at      TIMESTAMPTZ,
    sms_error        TEXT,

    -- Arbitrary extras: deep_link, image_url, action_buttons, etc.
    metadata         JSONB         NOT NULL DEFAULT '{}'::jsonb,

    -- Scheduling — NULL means send immediately
    scheduled_at     TIMESTAMPTZ,

    -- Audit
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user        ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread      ON notifications (user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_type        ON notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_equb        ON notifications (equb_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at  ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled   ON notifications (scheduled_at) WHERE scheduled_at IS NOT NULL;

INSERT INTO schema_migrations (version, description)
VALUES ('V008', 'Create notifications table')
ON CONFLICT (version) DO NOTHING;
