-- Up Migration

-- TASK-785 — Workforce Role Title Source of Truth + Governance.
--
-- Three-layer model:
--   1. Source tracking columns on greenhouse_core.members:
--        role_title_source              ('unset'|'entra'|'hr_manual'|'migration'|'self_declared_pending')
--        role_title_updated_by_user_id  (HR actor when source='hr_manual')
--        role_title_updated_at          (timestamp of last update)
--        last_human_update_at           (timestamp last time a human mutated
--                                        role_title via governed mutation;
--                                        Entra sync skips overwrite when this
--                                        is non-null AND source='hr_manual')
--   2. Append-only audit log greenhouse_core.member_role_title_audit_log
--      (same pattern as TASK-784 person_identity_document_audit_log).
--   3. Drift review queue greenhouse_sync.member_role_title_drift_proposals
--      (same pattern as reporting_hierarchy_drift_proposals).

-- ============================================================================
-- 1. members source tracking columns
-- ============================================================================

ALTER TABLE greenhouse_core.members
  ADD COLUMN IF NOT EXISTS role_title_source TEXT NOT NULL DEFAULT 'unset',
  ADD COLUMN IF NOT EXISTS role_title_updated_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS role_title_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_human_update_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'members_role_title_source_check'
  ) THEN
    ALTER TABLE greenhouse_core.members
      ADD CONSTRAINT members_role_title_source_check
      CHECK (role_title_source IN ('unset', 'entra', 'hr_manual', 'migration', 'self_declared_pending'));
  END IF;
END $$;

-- Backfill: existing rows with role_title set treat as 'entra' (current
-- behavior is that Entra sync wrote them); next sync still sees them as
-- overwriteable since last_human_update_at remains null.
UPDATE greenhouse_core.members
   SET role_title_source = 'entra',
       role_title_updated_at = COALESCE(role_title_updated_at, updated_at)
 WHERE role_title IS NOT NULL
   AND role_title_source = 'unset';

COMMENT ON COLUMN greenhouse_core.members.role_title_source IS
  'TASK-785 — origin of current role_title value. unset|entra|hr_manual|migration|self_declared_pending';
COMMENT ON COLUMN greenhouse_core.members.last_human_update_at IS
  'TASK-785 — timestamp last time HR mutated role_title via governed mutation. Entra sync skips overwrite when non-null AND source=hr_manual.';

-- ============================================================================
-- 2. member_role_title_audit_log (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_core.member_role_title_audit_log (
  audit_id        TEXT PRIMARY KEY,
  member_id       TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE RESTRICT,
  action          TEXT NOT NULL,
  actor_user_id   TEXT,
  actor_email     TEXT,
  reason          TEXT,
  source          TEXT NOT NULL,
  old_role_title  TEXT,
  new_role_title  TEXT,
  effective_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address      TEXT,
  user_agent      TEXT,
  diff_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_role_title_audit_action_check
    CHECK (action IN (
      'declared',
      'updated',
      'drift_proposed',
      'drift_accepted_entra',
      'drift_kept_hr',
      'drift_dismissed',
      'reverted'
    )),
  CONSTRAINT member_role_title_audit_source_check
    CHECK (source IN ('unset', 'entra', 'hr_manual', 'migration', 'self_declared_pending', 'system')),
  CONSTRAINT member_role_title_audit_diff_object
    CHECK (jsonb_typeof(diff_json) = 'object')
);

CREATE INDEX IF NOT EXISTS member_role_title_audit_log_member_idx
  ON greenhouse_core.member_role_title_audit_log (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS member_role_title_audit_log_actor_idx
  ON greenhouse_core.member_role_title_audit_log (actor_user_id, action, created_at DESC);

COMMENT ON TABLE greenhouse_core.member_role_title_audit_log IS
  'TASK-785 — Append-only audit log for member.role_title changes (HR mutations + Entra sync drift proposals). Same pattern as TASK-784.';

CREATE OR REPLACE FUNCTION greenhouse_core.assert_member_role_title_audit_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'member_role_title_audit_log es append-only. Para correcciones, insertar nueva fila con diff_json.correction_of=<audit_id>.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS member_role_title_audit_log_no_update_trigger
  ON greenhouse_core.member_role_title_audit_log;
DROP TRIGGER IF EXISTS member_role_title_audit_log_no_delete_trigger
  ON greenhouse_core.member_role_title_audit_log;

CREATE TRIGGER member_role_title_audit_log_no_update_trigger
  BEFORE UPDATE ON greenhouse_core.member_role_title_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_member_role_title_audit_append_only();

CREATE TRIGGER member_role_title_audit_log_no_delete_trigger
  BEFORE DELETE ON greenhouse_core.member_role_title_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_member_role_title_audit_append_only();

ALTER TABLE greenhouse_core.member_role_title_audit_log OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_core.member_role_title_audit_log TO greenhouse_runtime;

-- ============================================================================
-- 3. member_role_title_drift_proposals (review queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS greenhouse_sync.member_role_title_drift_proposals (
  proposal_id           TEXT PRIMARY KEY,
  member_id             TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  source_system         TEXT NOT NULL DEFAULT 'entra',
  source_sync_run_id    TEXT,
  drift_kind            TEXT NOT NULL,
  current_role_title    TEXT,
  current_source        TEXT,
  proposed_role_title   TEXT,
  status                TEXT NOT NULL DEFAULT 'pending',
  policy_action         TEXT NOT NULL DEFAULT 'review_required',
  first_detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_detected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_count      INTEGER NOT NULL DEFAULT 1,
  resolved_at           TIMESTAMPTZ,
  resolved_by_user_id   TEXT,
  resolution_note       TEXT,
  evidence_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mrtdp_drift_kind_check
    CHECK (drift_kind IN (
      'entra_overwrite_blocked',
      'entra_value_diverges',
      'entra_cleared_hr_value'
    )),
  CONSTRAINT mrtdp_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'dismissed', 'auto_applied')),
  CONSTRAINT mrtdp_policy_check
    CHECK (policy_action IN ('review_required', 'blocked_manual_precedence', 'auto_apply_allowed', 'no_action')),
  CONSTRAINT mrtdp_evidence_object
    CHECK (jsonb_typeof(evidence_json) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS mrtdp_active_unique
  ON greenhouse_sync.member_role_title_drift_proposals (member_id, source_system, drift_kind)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS mrtdp_status_detected_idx
  ON greenhouse_sync.member_role_title_drift_proposals (status, last_detected_at DESC);

COMMENT ON TABLE greenhouse_sync.member_role_title_drift_proposals IS
  'TASK-785 — Review queue for role_title drift between Entra/Graph (jobTitle) and Greenhouse HR-managed value. Pattern: reporting_hierarchy_drift_proposals.';

CREATE OR REPLACE FUNCTION greenhouse_sync.mrtdp_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mrtdp_set_updated_at_trigger
  ON greenhouse_sync.member_role_title_drift_proposals;

CREATE TRIGGER mrtdp_set_updated_at_trigger
  BEFORE UPDATE ON greenhouse_sync.member_role_title_drift_proposals
  FOR EACH ROW EXECUTE FUNCTION greenhouse_sync.mrtdp_set_updated_at();

ALTER TABLE greenhouse_sync.member_role_title_drift_proposals OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_sync.member_role_title_drift_proposals
  TO greenhouse_runtime;

-- Down Migration

DROP TRIGGER IF EXISTS mrtdp_set_updated_at_trigger
  ON greenhouse_sync.member_role_title_drift_proposals;
DROP FUNCTION IF EXISTS greenhouse_sync.mrtdp_set_updated_at();
DROP TABLE IF EXISTS greenhouse_sync.member_role_title_drift_proposals;

DROP TRIGGER IF EXISTS member_role_title_audit_log_no_delete_trigger
  ON greenhouse_core.member_role_title_audit_log;
DROP TRIGGER IF EXISTS member_role_title_audit_log_no_update_trigger
  ON greenhouse_core.member_role_title_audit_log;
DROP FUNCTION IF EXISTS greenhouse_core.assert_member_role_title_audit_append_only();
DROP TABLE IF EXISTS greenhouse_core.member_role_title_audit_log;

ALTER TABLE greenhouse_core.members
  DROP CONSTRAINT IF EXISTS members_role_title_source_check;

ALTER TABLE greenhouse_core.members
  DROP COLUMN IF EXISTS last_human_update_at,
  DROP COLUMN IF EXISTS role_title_updated_at,
  DROP COLUMN IF EXISTS role_title_updated_by_user_id,
  DROP COLUMN IF EXISTS role_title_source;
