-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_payroll.final_settlements (
  final_settlement_id                 TEXT PRIMARY KEY,
  offboarding_case_id                 TEXT NOT NULL REFERENCES greenhouse_hr.work_relationship_offboarding_cases(offboarding_case_id) ON DELETE RESTRICT,
  settlement_version                  INTEGER NOT NULL DEFAULT 1 CHECK (settlement_version >= 1),
  supersedes_final_settlement_id      TEXT REFERENCES greenhouse_payroll.final_settlements(final_settlement_id) ON DELETE RESTRICT,
  profile_id                          TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  member_id                           TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE RESTRICT,
  person_legal_entity_relationship_id TEXT REFERENCES greenhouse_core.person_legal_entity_relationships(relationship_id) ON DELETE RESTRICT,
  legal_entity_organization_id        TEXT REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  compensation_version_id             TEXT REFERENCES greenhouse_payroll.compensation_versions(version_id) ON DELETE RESTRICT,
  separation_type                     TEXT NOT NULL CHECK (separation_type IN ('resignation')),
  contract_type_snapshot              TEXT NOT NULL CHECK (contract_type_snapshot IN ('indefinido', 'plazo_fijo')),
  pay_regime_snapshot                 TEXT NOT NULL CHECK (pay_regime_snapshot IN ('chile')),
  payroll_via_snapshot                TEXT NOT NULL CHECK (payroll_via_snapshot IN ('internal')),
  effective_date                      DATE NOT NULL,
  last_working_day                    DATE NOT NULL,
  contract_end_date_snapshot          DATE,
  hire_date_snapshot                  DATE,
  calculation_status                  TEXT NOT NULL DEFAULT 'draft' CHECK (calculation_status IN ('draft', 'calculated', 'reviewed', 'approved', 'issued', 'cancelled')),
  readiness_status                    TEXT NOT NULL DEFAULT 'blocked' CHECK (readiness_status IN ('ready', 'needs_review', 'blocked')),
  readiness_has_blockers              BOOLEAN NOT NULL DEFAULT TRUE,
  currency                            TEXT NOT NULL DEFAULT 'CLP' CHECK (currency IN ('CLP')),
  gross_total                         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gross_total >= 0),
  deduction_total                     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (deduction_total >= 0),
  net_payable                         NUMERIC(14,2) NOT NULL DEFAULT 0,
  source_snapshot_json                JSONB NOT NULL DEFAULT '{}'::jsonb,
  breakdown_json                      JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation_json                    JSONB NOT NULL DEFAULT '{}'::jsonb,
  readiness_json                      JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at                       TIMESTAMPTZ,
  calculated_by_user_id               TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  approved_at                         TIMESTAMPTZ,
  approved_by_user_id                 TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  cancelled_at                        TIMESTAMPTZ,
  cancelled_by_user_id                TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  cancel_reason                       TEXT,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT final_settlements_case_version_unique UNIQUE (offboarding_case_id, settlement_version),
  CONSTRAINT final_settlements_status_calculated_check
    CHECK (calculation_status NOT IN ('calculated', 'reviewed', 'approved', 'issued') OR calculated_at IS NOT NULL),
  CONSTRAINT final_settlements_status_approved_check
    CHECK (calculation_status NOT IN ('approved', 'issued') OR (approved_at IS NOT NULL AND approved_by_user_id IS NOT NULL)),
  CONSTRAINT final_settlements_status_cancelled_check
    CHECK (calculation_status <> 'cancelled' OR (cancelled_at IS NOT NULL AND cancelled_by_user_id IS NOT NULL AND NULLIF(BTRIM(COALESCE(cancel_reason, '')), '') IS NOT NULL)),
  CONSTRAINT final_settlements_net_total_check
    CHECK (net_payable = gross_total - deduction_total)
);

CREATE INDEX IF NOT EXISTS final_settlements_case_created_idx
  ON greenhouse_payroll.final_settlements (offboarding_case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS final_settlements_member_effective_idx
  ON greenhouse_payroll.final_settlements (member_id, effective_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS final_settlements_one_open_case_idx
  ON greenhouse_payroll.final_settlements (offboarding_case_id)
  WHERE calculation_status IN ('draft', 'calculated', 'reviewed', 'approved', 'issued');

CREATE TABLE IF NOT EXISTS greenhouse_payroll.final_settlement_events (
  event_id              TEXT PRIMARY KEY,
  final_settlement_id   TEXT NOT NULL REFERENCES greenhouse_payroll.final_settlements(final_settlement_id) ON DELETE CASCADE,
  offboarding_case_id   TEXT NOT NULL REFERENCES greenhouse_hr.work_relationship_offboarding_cases(offboarding_case_id) ON DELETE RESTRICT,
  event_type            TEXT NOT NULL,
  from_status           TEXT,
  to_status             TEXT,
  actor_user_id         TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  reason                TEXT,
  payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS final_settlement_events_settlement_created_idx
  ON greenhouse_payroll.final_settlement_events (final_settlement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS final_settlement_events_case_created_idx
  ON greenhouse_payroll.final_settlement_events (offboarding_case_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_payroll.touch_final_settlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_final_settlements_touch_updated_at
  ON greenhouse_payroll.final_settlements;

CREATE TRIGGER trg_final_settlements_touch_updated_at
  BEFORE UPDATE ON greenhouse_payroll.final_settlements
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_payroll.touch_final_settlements_updated_at();

ALTER TABLE greenhouse_payroll.final_settlements OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.final_settlement_events OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_payroll.touch_final_settlements_updated_at() OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlements TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlement_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlements TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlement_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlements TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.final_settlement_events TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_payroll.final_settlements IS
  'TASK-761 canonical Chile final settlement/finiquito aggregate. Separate from monthly payroll entries and linked to an approved offboarding case.';

COMMENT ON COLUMN greenhouse_payroll.final_settlements.contract_end_date_snapshot IS
  'Contract end date snapshot retained as evidence only. final settlement calculation is driven by offboarding effective_date and last_working_day.';

COMMENT ON COLUMN greenhouse_payroll.final_settlements.readiness_json IS
  'Auditable blockers/warnings/evidence used to approve or block final settlement lifecycle transitions.';

COMMENT ON TABLE greenhouse_payroll.final_settlement_events IS
  'Append-only audit trail for TASK-761 final settlement calculation, approval and cancellation lifecycle.';

-- Down Migration

DROP TRIGGER IF EXISTS trg_final_settlements_touch_updated_at
  ON greenhouse_payroll.final_settlements;
DROP FUNCTION IF EXISTS greenhouse_payroll.touch_final_settlements_updated_at();
DROP TABLE IF EXISTS greenhouse_payroll.final_settlement_events;
DROP TABLE IF EXISTS greenhouse_payroll.final_settlements;
