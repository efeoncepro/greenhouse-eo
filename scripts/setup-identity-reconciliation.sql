-- Identity Reconciliation Proposals
-- Schema: greenhouse_sync (existing)
-- Purpose: Store discovery + matching proposals for source-system identity linking.
-- Run once; idempotent via IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS greenhouse_sync.identity_reconciliation_proposals (
  proposal_id            TEXT PRIMARY KEY,
  -- Discovery context
  source_system          TEXT NOT NULL,        -- 'notion', 'hubspot_crm', 'azure_ad'
  source_object_type     TEXT NOT NULL,        -- 'person', 'owner', 'user'
  source_object_id       TEXT NOT NULL,        -- UUID/ID from the source system
  source_display_name    TEXT,
  source_email           TEXT,
  discovered_in          TEXT NOT NULL,        -- e.g. 'notion_ops.tareas.responsables_ids'
  occurrence_count       INT NOT NULL DEFAULT 1,
  -- Match candidate
  candidate_member_id    TEXT,
  candidate_profile_id   TEXT,
  candidate_display_name TEXT,
  -- Confidence
  match_confidence       NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  match_signals          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Resolution
  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','auto_linked','admin_approved','admin_rejected','dismissed')),
  resolved_by            TEXT,
  resolved_at            TIMESTAMPTZ,
  resolution_note        TEXT,
  -- Lifecycle
  sync_run_id            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Only one active proposal per source identity (prevents duplicates on re-run)
CREATE UNIQUE INDEX IF NOT EXISTS idx_recon_active_source
  ON greenhouse_sync.identity_reconciliation_proposals (source_system, source_object_type, source_object_id)
  WHERE status IN ('pending', 'auto_linked');

-- Admin queue lookup
CREATE INDEX IF NOT EXISTS idx_recon_status
  ON greenhouse_sync.identity_reconciliation_proposals (status, created_at DESC);
