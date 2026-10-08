-- =============================================================================
-- V001 — Initialise schema_migrations tracking table
-- Applied once; all subsequent migrations check this table first.
-- =============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(10)  PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
