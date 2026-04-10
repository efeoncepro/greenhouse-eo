-- Up Migration

SET search_path = greenhouse_sync, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_sync.reporting_hierarchy_drift_proposals (
  proposal_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  source_sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  source_member_id TEXT,
  source_member_email TEXT,
  source_member_name TEXT,
  source_supervisor_id TEXT,
  source_supervisor_email TEXT,
  source_supervisor_name TEXT,
  current_supervisor_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  proposed_supervisor_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  current_reporting_line_id TEXT REFERENCES greenhouse_core.reporting_lines(reporting_line_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  drift_kind TEXT NOT NULL DEFAULT 'supervisor_mismatch',
  policy_action TEXT NOT NULL DEFAULT 'review_required',
  severity TEXT NOT NULL DEFAULT 'warning',
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  resolution_note TEXT,
  evidence_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reporting_hierarchy_drift_proposals_status_check CHECK (
    status = ANY (ARRAY[
      'pending'::TEXT,
      'approved'::TEXT,
      'rejected'::TEXT,
      'dismissed'::TEXT,
      'auto_applied'::TEXT
    ])
  ),
  CONSTRAINT reporting_hierarchy_drift_proposals_drift_kind_check CHECK (
    drift_kind = ANY (ARRAY[
      'supervisor_mismatch'::TEXT,
      'missing_greenhouse_supervisor'::TEXT,
      'missing_source_supervisor'::TEXT,
      'source_supervisor_unresolved'::TEXT,
      'member_not_linked_to_source'::TEXT
    ])
  ),
  CONSTRAINT reporting_hierarchy_drift_proposals_policy_action_check CHECK (
    policy_action = ANY (ARRAY[
      'review_required'::TEXT,
      'blocked_manual_precedence'::TEXT,
      'auto_apply_allowed'::TEXT,
      'no_action'::TEXT
    ])
  ),
  CONSTRAINT reporting_hierarchy_drift_proposals_severity_check CHECK (
    severity = ANY (ARRAY['info'::TEXT, 'warning'::TEXT, 'error'::TEXT])
  ),
  CONSTRAINT reporting_hierarchy_drift_proposals_occurrence_count_check CHECK (
    occurrence_count >= 1
  )
);

COMMENT ON TABLE greenhouse_sync.reporting_hierarchy_drift_proposals IS
  'Review queue for hierarchy governance drift between greenhouse_core.reporting_lines and external supported sources such as Entra.';

CREATE INDEX IF NOT EXISTS idx_reporting_hierarchy_drift_proposals_status
  ON greenhouse_sync.reporting_hierarchy_drift_proposals (status, last_detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_reporting_hierarchy_drift_proposals_member
  ON greenhouse_sync.reporting_hierarchy_drift_proposals (member_id, source_system, last_detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_reporting_hierarchy_drift_proposals_run
  ON greenhouse_sync.reporting_hierarchy_drift_proposals (source_sync_run_id, status, last_detected_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reporting_hierarchy_drift_active_member
  ON greenhouse_sync.reporting_hierarchy_drift_proposals (member_id, source_system, drift_kind)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.reporting_hierarchy_drift_proposals TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.reporting_hierarchy_drift_proposals TO greenhouse_migrator;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_sync.idx_reporting_hierarchy_drift_active_member;
DROP INDEX IF EXISTS greenhouse_sync.idx_reporting_hierarchy_drift_proposals_run;
DROP INDEX IF EXISTS greenhouse_sync.idx_reporting_hierarchy_drift_proposals_member;
DROP INDEX IF EXISTS greenhouse_sync.idx_reporting_hierarchy_drift_proposals_status;

DROP TABLE IF EXISTS greenhouse_sync.reporting_hierarchy_drift_proposals;
