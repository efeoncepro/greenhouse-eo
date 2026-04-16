-- Up Migration

ALTER TABLE greenhouse_hr.leave_policies
  ADD COLUMN IF NOT EXISTS applicable_contract_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_payroll_vias TEXT[] NOT NULL DEFAULT '{}';

UPDATE greenhouse_hr.leave_policies
SET
  applicable_contract_types = ARRAY['indefinido', 'plazo_fijo'],
  applicable_payroll_vias = ARRAY['internal']
WHERE policy_id = 'policy-vacation-chile';

ALTER TABLE greenhouse_hr.leave_requests
  ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'request';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_requests_source_kind_check'
  ) THEN
    ALTER TABLE greenhouse_hr.leave_requests
      ADD CONSTRAINT leave_requests_source_kind_check
      CHECK (source_kind IN ('request', 'admin_backfill'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_balance_adjustments (
  adjustment_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  leave_type_code TEXT NOT NULL REFERENCES greenhouse_hr.leave_types(leave_type_code),
  year INTEGER NOT NULL,
  days_delta NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'manual_adjustment',
  notes TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reversed_at TIMESTAMPTZ,
  reversed_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  reversal_of_adjustment_id TEXT REFERENCES greenhouse_hr.leave_balance_adjustments(adjustment_id),
  CONSTRAINT leave_balance_adjustments_source_kind_check
    CHECK (source_kind IN ('manual_adjustment', 'manual_adjustment_reversal'))
);

CREATE INDEX IF NOT EXISTS leave_balance_adjustments_member_year_idx
  ON greenhouse_hr.leave_balance_adjustments (member_id, year, created_at DESC);

CREATE INDEX IF NOT EXISTS leave_balance_adjustments_type_year_idx
  ON greenhouse_hr.leave_balance_adjustments (leave_type_code, year, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS leave_balance_adjustments_reversal_unique
  ON greenhouse_hr.leave_balance_adjustments (reversal_of_adjustment_id)
  WHERE reversal_of_adjustment_id IS NOT NULL;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_hr.leave_balance_adjustments_reversal_unique;
DROP INDEX IF EXISTS greenhouse_hr.leave_balance_adjustments_type_year_idx;
DROP INDEX IF EXISTS greenhouse_hr.leave_balance_adjustments_member_year_idx;

DROP TABLE IF EXISTS greenhouse_hr.leave_balance_adjustments;

ALTER TABLE greenhouse_hr.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_source_kind_check;

ALTER TABLE greenhouse_hr.leave_requests
  DROP COLUMN IF EXISTS source_kind;

ALTER TABLE greenhouse_hr.leave_policies
  DROP COLUMN IF EXISTS applicable_payroll_vias,
  DROP COLUMN IF EXISTS applicable_contract_types;
