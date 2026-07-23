-- Up Migration

-- TASK-1521 — Durable Greenhouse -> Globe tenancy reconciliation cursor.
--
-- This table is Greenhouse-owned delivery state, not tenancy authority. Desired
-- workspaces/members/capabilities continue to come from the canonical sister
-- platform bindings, Greenhouse principals and the Globe OAuth policy.

CREATE TABLE IF NOT EXISTS greenhouse_sync.globe_tenancy_reconciliation_state (
  workspace_id TEXT PRIMARY KEY,
  broker_binding_id TEXT NOT NULL,
  workspace_revision BIGINT NOT NULL DEFAULT 0 CHECK (workspace_revision >= 0),
  workspace_fingerprint TEXT,
  member_revisions JSONB NOT NULL DEFAULT '{}'::jsonb,
  lease_token UUID,
  lease_expires_at TIMESTAMPTZ,
  last_reconciliation_id UUID,
  last_reconciled_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT globe_tenancy_reconciliation_member_revisions_object
    CHECK (jsonb_typeof(member_revisions) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_globe_tenancy_reconciliation_due_lease
  ON greenhouse_sync.globe_tenancy_reconciliation_state (lease_expires_at, updated_at);

COMMENT ON TABLE greenhouse_sync.globe_tenancy_reconciliation_state IS
  'Delivery cursor and overlap lease for Greenhouse-owned full-workspace Globe tenancy snapshots.';
COMMENT ON COLUMN greenhouse_sync.globe_tenancy_reconciliation_state.workspace_revision IS
  'Semantic desired-state revision. Freshness-only lease renewal never increments it.';
COMMENT ON COLUMN greenhouse_sync.globe_tenancy_reconciliation_state.member_revisions IS
  'Per identity subject semantic fingerprint/revision map; contains no email, name or token.';

GRANT SELECT, INSERT, UPDATE
  ON greenhouse_sync.globe_tenancy_reconciliation_state
  TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_sync.globe_tenancy_reconciliation_state;
