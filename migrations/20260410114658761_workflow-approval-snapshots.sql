-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_hr.workflow_approval_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  workflow_domain TEXT NOT NULL CHECK (
    workflow_domain IN ('leave', 'expense_report', 'onboarding', 'offboarding', 'performance_evaluation')
  ),
  workflow_entity_id TEXT NOT NULL,
  stage_code TEXT NOT NULL CHECK (
    stage_code IN ('supervisor_review', 'hr_review', 'finance_review')
  ),
  subject_member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  authority_source TEXT NOT NULL CHECK (
    authority_source IN ('reporting_hierarchy', 'delegation', 'domain_fallback', 'admin_override')
  ),
  formal_approver_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  formal_approver_name TEXT,
  effective_approver_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  effective_approver_name TEXT,
  delegate_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  delegate_member_name TEXT,
  delegate_responsibility_id TEXT REFERENCES greenhouse_core.operational_responsibilities(responsibility_id) ON DELETE SET NULL,
  fallback_role_codes TEXT[] NOT NULL DEFAULT '{}',
  override_actor_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  override_reason TEXT,
  snapshot_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_approval_snapshots_workflow_stage
  ON greenhouse_hr.workflow_approval_snapshots (workflow_domain, workflow_entity_id, stage_code);

CREATE INDEX IF NOT EXISTS idx_workflow_approval_snapshots_subject_member
  ON greenhouse_hr.workflow_approval_snapshots (subject_member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_approval_snapshots_effective_approver
  ON greenhouse_hr.workflow_approval_snapshots (effective_approver_member_id, workflow_domain, stage_code);

CREATE OR REPLACE FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_approval_snapshots_touch_updated_at
  ON greenhouse_hr.workflow_approval_snapshots;

CREATE TRIGGER trg_workflow_approval_snapshots_touch_updated_at
BEFORE UPDATE ON greenhouse_hr.workflow_approval_snapshots
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workflow_approval_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workflow_approval_snapshots TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workflow_approval_snapshots TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at() TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at() TO greenhouse_migrator_user;

-- Down Migration

REVOKE EXECUTE ON FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at() FROM greenhouse_runtime;
REVOKE EXECUTE ON FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at() FROM greenhouse_app;
REVOKE EXECUTE ON FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at() FROM greenhouse_migrator_user;

REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workflow_approval_snapshots FROM greenhouse_runtime;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workflow_approval_snapshots FROM greenhouse_app;
REVOKE SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.workflow_approval_snapshots FROM greenhouse_migrator_user;

DROP TRIGGER IF EXISTS trg_workflow_approval_snapshots_touch_updated_at
  ON greenhouse_hr.workflow_approval_snapshots;

DROP FUNCTION IF EXISTS greenhouse_hr.touch_workflow_approval_snapshots_updated_at();

DROP TABLE IF EXISTS greenhouse_hr.workflow_approval_snapshots;
