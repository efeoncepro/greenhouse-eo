-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_hr.work_relationship_offboarding_cases (
  offboarding_case_id                  TEXT PRIMARY KEY,
  public_id                            TEXT NOT NULL UNIQUE,
  profile_id                           TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  member_id                            TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  user_id                              TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  person_legal_entity_relationship_id  TEXT REFERENCES greenhouse_core.person_legal_entity_relationships(relationship_id) ON DELETE RESTRICT,
  legal_entity_organization_id         TEXT REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  organization_id                      TEXT REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  space_id                             TEXT REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  relationship_type                    TEXT NOT NULL CHECK (relationship_type IN ('employee', 'contractor', 'eor', 'executive', 'other')),
  employment_type                      TEXT,
  contract_type_snapshot               TEXT NOT NULL CHECK (contract_type_snapshot IN ('indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor', 'unknown')),
  pay_regime_snapshot                  TEXT NOT NULL CHECK (pay_regime_snapshot IN ('chile', 'international', 'unknown')),
  payroll_via_snapshot                 TEXT NOT NULL CHECK (payroll_via_snapshot IN ('internal', 'deel', 'none', 'unknown')),
  deel_contract_id_snapshot            TEXT,
  country_code                         TEXT,
  contract_end_date_snapshot           DATE,
  separation_type                      TEXT NOT NULL CHECK (separation_type IN (
                                          'resignation',
                                          'termination',
                                          'fixed_term_expiry',
                                          'mutual_agreement',
                                          'contract_end',
                                          'relationship_transition',
                                          'identity_only',
                                          'other'
                                        )),
  source                               TEXT NOT NULL CHECK (source IN (
                                          'manual_hr',
                                          'people',
                                          'scim',
                                          'admin',
                                          'contract_expiry',
                                          'external_provider',
                                          'legacy_checklist',
                                          'system'
                                        )),
  status                               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                                          'draft',
                                          'needs_review',
                                          'approved',
                                          'scheduled',
                                          'blocked',
                                          'executed',
                                          'cancelled'
                                        )),
  rule_lane                            TEXT NOT NULL CHECK (rule_lane IN (
                                          'internal_payroll',
                                          'external_payroll',
                                          'non_payroll',
                                          'identity_only',
                                          'relationship_transition',
                                          'unknown'
                                        )),
  requires_payroll_closure             BOOLEAN NOT NULL DEFAULT FALSE,
  requires_leave_reconciliation        BOOLEAN NOT NULL DEFAULT FALSE,
  requires_hr_documents                BOOLEAN NOT NULL DEFAULT FALSE,
  requires_access_revocation           BOOLEAN NOT NULL DEFAULT TRUE,
  requires_asset_recovery              BOOLEAN NOT NULL DEFAULT FALSE,
  requires_assignment_handoff          BOOLEAN NOT NULL DEFAULT TRUE,
  requires_approval_reassignment       BOOLEAN NOT NULL DEFAULT TRUE,
  greenhouse_execution_mode            TEXT NOT NULL DEFAULT 'partial' CHECK (greenhouse_execution_mode IN ('full', 'partial', 'informational')),
  effective_date                       DATE,
  last_working_day                     DATE,
  last_working_day_after_effective_reason TEXT,
  submitted_at                         TIMESTAMPTZ,
  approved_at                          TIMESTAMPTZ,
  scheduled_at                         TIMESTAMPTZ,
  executed_at                          TIMESTAMPTZ,
  cancelled_at                         TIMESTAMPTZ,
  blocked_reason                       TEXT,
  reason_code                          TEXT,
  notes                                TEXT,
  legacy_checklist_ref                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_ref                           JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json                        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id                   TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  updated_by_user_id                   TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  created_at                           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT offboarding_case_effective_date_required_check
    CHECK (status NOT IN ('approved', 'scheduled', 'executed') OR effective_date IS NOT NULL),
  CONSTRAINT offboarding_case_last_working_day_required_check
    CHECK (status NOT IN ('scheduled', 'executed') OR last_working_day IS NOT NULL),
  CONSTRAINT offboarding_case_last_working_day_window_check
    CHECK (
      last_working_day IS NULL
      OR effective_date IS NULL
      OR last_working_day <= effective_date
      OR NULLIF(BTRIM(COALESCE(last_working_day_after_effective_reason, '')), '') IS NOT NULL
    ),
  CONSTRAINT offboarding_case_executed_timestamp_check
    CHECK (status <> 'executed' OR executed_at IS NOT NULL),
  CONSTRAINT offboarding_case_cancelled_timestamp_check
    CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL),
  CONSTRAINT offboarding_case_blocked_reason_check
    CHECK (status <> 'blocked' OR NULLIF(BTRIM(COALESCE(blocked_reason, '')), '') IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS work_relationship_offboarding_cases_one_active_relationship_idx
  ON greenhouse_hr.work_relationship_offboarding_cases (person_legal_entity_relationship_id)
  WHERE person_legal_entity_relationship_id IS NOT NULL
    AND status NOT IN ('executed', 'cancelled');

CREATE UNIQUE INDEX IF NOT EXISTS work_relationship_offboarding_cases_one_active_member_idx
  ON greenhouse_hr.work_relationship_offboarding_cases (member_id)
  WHERE person_legal_entity_relationship_id IS NULL
    AND member_id IS NOT NULL
    AND status NOT IN ('executed', 'cancelled');

CREATE INDEX IF NOT EXISTS work_relationship_offboarding_cases_status_effective_idx
  ON greenhouse_hr.work_relationship_offboarding_cases (status, effective_date);

CREATE INDEX IF NOT EXISTS work_relationship_offboarding_cases_member_created_idx
  ON greenhouse_hr.work_relationship_offboarding_cases (member_id, created_at DESC)
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS work_relationship_offboarding_cases_profile_created_idx
  ON greenhouse_hr.work_relationship_offboarding_cases (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS work_relationship_offboarding_cases_lane_status_idx
  ON greenhouse_hr.work_relationship_offboarding_cases (rule_lane, status);

CREATE TABLE IF NOT EXISTS greenhouse_hr.work_relationship_offboarding_case_events (
  event_id              TEXT PRIMARY KEY,
  offboarding_case_id   TEXT NOT NULL REFERENCES greenhouse_hr.work_relationship_offboarding_cases(offboarding_case_id) ON DELETE CASCADE,
  event_type            TEXT NOT NULL,
  from_status           TEXT,
  to_status             TEXT,
  actor_user_id         TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  source                TEXT NOT NULL DEFAULT 'system',
  reason                TEXT,
  payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_relationship_offboarding_case_events_case_created_idx
  ON greenhouse_hr.work_relationship_offboarding_case_events (offboarding_case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS work_relationship_offboarding_case_events_type_created_idx
  ON greenhouse_hr.work_relationship_offboarding_case_events (event_type, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_hr.touch_work_relationship_offboarding_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_relationship_offboarding_cases_touch_updated_at
  ON greenhouse_hr.work_relationship_offboarding_cases;

CREATE TRIGGER trg_work_relationship_offboarding_cases_touch_updated_at
  BEFORE UPDATE ON greenhouse_hr.work_relationship_offboarding_cases
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_hr.touch_work_relationship_offboarding_cases_updated_at();

ALTER TABLE greenhouse_hr.work_relationship_offboarding_cases OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.work_relationship_offboarding_case_events OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_hr.touch_work_relationship_offboarding_cases_updated_at() OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.work_relationship_offboarding_cases TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.work_relationship_offboarding_case_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.work_relationship_offboarding_cases TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.work_relationship_offboarding_case_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.work_relationship_offboarding_cases TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.work_relationship_offboarding_case_events TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_hr.work_relationship_offboarding_cases IS
  'TASK-760 canonical workforce offboarding aggregate. Models a work relationship separation case; not a login deactivation or checklist.';

COMMENT ON COLUMN greenhouse_hr.work_relationship_offboarding_cases.contract_end_date_snapshot IS
  'Contractual end date snapshot. It is evidence/review input only and never replaces effective_date.';

COMMENT ON COLUMN greenhouse_hr.work_relationship_offboarding_cases.legacy_checklist_ref IS
  'Optional reference to future/legacy HRIS checklist runtime. Nullable-by-json because TASK-030 checklist tables are documented but not deployed.';

COMMENT ON TABLE greenhouse_hr.work_relationship_offboarding_case_events IS
  'Append-only audit trail for TASK-760 offboarding case lifecycle events and transitions.';

-- Down Migration

DROP TRIGGER IF EXISTS trg_work_relationship_offboarding_cases_touch_updated_at
  ON greenhouse_hr.work_relationship_offboarding_cases;
DROP FUNCTION IF EXISTS greenhouse_hr.touch_work_relationship_offboarding_cases_updated_at();
DROP TABLE IF EXISTS greenhouse_hr.work_relationship_offboarding_case_events;
DROP TABLE IF EXISTS greenhouse_hr.work_relationship_offboarding_cases;
