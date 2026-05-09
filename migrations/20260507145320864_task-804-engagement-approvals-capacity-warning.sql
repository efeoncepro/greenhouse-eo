-- Up Migration

-- TASK-804 — Engagement approvals workflow + capacity warning soft.
-- Sample Sprints remain greenhouse_core.services rows with engagement_kind != regular.
-- This table captures governance state and the deterministic capacity warning
-- snapshot used at approval time.

CREATE TABLE greenhouse_commercial.engagement_approvals (
  approval_id TEXT PRIMARY KEY DEFAULT ('engagement-approval-' || gen_random_uuid()::TEXT),
  service_id TEXT NOT NULL
    REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  requested_by TEXT
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  expected_internal_cost_clp NUMERIC(18, 2) NOT NULL
    CHECK (expected_internal_cost_clp >= 0),
  expected_duration_days INTEGER NOT NULL
    CHECK (expected_duration_days BETWEEN 7 AND 120),
  decision_deadline DATE NOT NULL,
  success_criteria_json JSONB NOT NULL
    CHECK (jsonb_typeof(success_criteria_json) = 'object'),
  capacity_warning_json JSONB,
  capacity_override_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  approved_by TEXT
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by TEXT
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  withdrawn_by TEXT
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT engagement_approvals_service_unique UNIQUE (service_id),
  CONSTRAINT engagement_approvals_pending_shape CHECK (
    status != 'pending'
    OR (
      approved_by IS NULL
      AND approved_at IS NULL
      AND rejected_by IS NULL
      AND rejected_at IS NULL
      AND rejection_reason IS NULL
      AND withdrawn_by IS NULL
      AND withdrawn_at IS NULL
      AND withdrawal_reason IS NULL
    )
  ),
  CONSTRAINT engagement_approvals_approved_shape CHECK (
    status != 'approved'
    OR (
      approved_by IS NOT NULL
      AND approved_at IS NOT NULL
      AND rejected_by IS NULL
      AND rejected_at IS NULL
      AND rejection_reason IS NULL
      AND withdrawn_by IS NULL
      AND withdrawn_at IS NULL
      AND withdrawal_reason IS NULL
    )
  ),
  CONSTRAINT engagement_approvals_rejected_shape CHECK (
    status != 'rejected'
    OR (
      rejected_by IS NOT NULL
      AND rejected_at IS NOT NULL
      AND length(btrim(rejection_reason)) >= 10
      AND approved_by IS NULL
      AND approved_at IS NULL
      AND withdrawn_by IS NULL
      AND withdrawn_at IS NULL
      AND withdrawal_reason IS NULL
    )
  ),
  CONSTRAINT engagement_approvals_withdrawn_shape CHECK (
    status != 'withdrawn'
    OR (
      withdrawn_by IS NOT NULL
      AND withdrawn_at IS NOT NULL
      AND approved_by IS NULL
      AND approved_at IS NULL
      AND rejected_by IS NULL
      AND rejected_at IS NULL
      AND rejection_reason IS NULL
    )
  ),
  CONSTRAINT engagement_approvals_override_reason_shape CHECK (
    capacity_override_reason IS NULL
    OR length(btrim(capacity_override_reason)) >= 10
  ),
  CONSTRAINT engagement_approvals_withdrawal_reason_shape CHECK (
    withdrawal_reason IS NULL
    OR length(btrim(withdrawal_reason)) >= 10
  )
);

CREATE INDEX engagement_approvals_pending_idx
  ON greenhouse_commercial.engagement_approvals (status, decision_deadline)
  WHERE status = 'pending';

CREATE INDEX engagement_approvals_service_status_idx
  ON greenhouse_commercial.engagement_approvals (service_id, status);

CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_approvals_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_engagement_approvals_updated_at
  BEFORE UPDATE ON greenhouse_commercial.engagement_approvals
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_commercial.engagement_approvals_set_updated_at();

COMMENT ON TABLE greenhouse_commercial.engagement_approvals IS
  'TASK-804. Governance workflow for non-regular engagement services (Sample Sprints).';

COMMENT ON COLUMN greenhouse_commercial.engagement_approvals.service_id IS
  'FK to greenhouse_core.services(service_id). TEXT by TASK-801 contract, not UUID.';

COMMENT ON COLUMN greenhouse_commercial.engagement_approvals.success_criteria_json IS
  'Approval-time success criteria snapshot. Object shape is validated by application helpers.';

COMMENT ON COLUMN greenhouse_commercial.engagement_approvals.capacity_warning_json IS
  'Deterministic capacity warning snapshot evaluated at approval time; persisted even when no override is needed.';

COMMENT ON COLUMN greenhouse_commercial.engagement_approvals.capacity_override_reason IS
  'Required by application helper when any proposed member exceeds 100% FTE after the approval.';

GRANT SELECT, INSERT, UPDATE ON TABLE greenhouse_commercial.engagement_approvals TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE greenhouse_commercial.engagement_approvals TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE greenhouse_commercial.engagement_approvals TO greenhouse_migrator;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.engagement_approvals;
DROP FUNCTION IF EXISTS greenhouse_commercial.engagement_approvals_set_updated_at();
