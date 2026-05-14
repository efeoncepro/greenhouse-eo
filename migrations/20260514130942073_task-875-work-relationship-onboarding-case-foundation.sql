-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_hr.work_relationship_onboarding_cases (
  onboarding_case_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  profile_id TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  person_legal_entity_relationship_id TEXT REFERENCES greenhouse_core.person_legal_entity_relationships(relationship_id) ON DELETE RESTRICT,
  legal_entity_organization_id TEXT REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  organization_id TEXT REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  space_id TEXT REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  relationship_type TEXT NOT NULL DEFAULT 'employee',
  employment_type TEXT,
  contract_type_snapshot TEXT NOT NULL DEFAULT 'unknown',
  pay_regime_snapshot TEXT NOT NULL DEFAULT 'unknown',
  payroll_via_snapshot TEXT NOT NULL DEFAULT 'unknown',
  deel_contract_id_snapshot TEXT,
  country_code TEXT,
  start_type TEXT NOT NULL DEFAULT 'new_hire',
  source TEXT NOT NULL DEFAULT 'manual_hr',
  status TEXT NOT NULL DEFAULT 'draft',
  rule_lane TEXT NOT NULL DEFAULT 'unknown',
  requires_identity_provisioning BOOLEAN NOT NULL DEFAULT TRUE,
  requires_application_access BOOLEAN NOT NULL DEFAULT TRUE,
  requires_payroll_readiness BOOLEAN NOT NULL DEFAULT FALSE,
  requires_leave_policy_bootstrap BOOLEAN NOT NULL DEFAULT FALSE,
  requires_hr_documents BOOLEAN NOT NULL DEFAULT FALSE,
  requires_assignment_bootstrap BOOLEAN NOT NULL DEFAULT TRUE,
  requires_manager_assignment BOOLEAN NOT NULL DEFAULT TRUE,
  requires_equipment_or_access_setup BOOLEAN NOT NULL DEFAULT FALSE,
  greenhouse_execution_mode TEXT NOT NULL DEFAULT 'partial',
  start_date DATE,
  first_working_day DATE,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  blocked_reason TEXT,
  manager_member_id TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  reason_code TEXT,
  notes TEXT,
  legacy_checklist_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT work_relationship_onboarding_cases_relationship_type_check
    CHECK (relationship_type IN ('employee', 'contractor', 'eor', 'executive', 'other')),
  CONSTRAINT work_relationship_onboarding_cases_contract_type_check
    CHECK (contract_type_snapshot IN ('indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor', 'unknown')),
  CONSTRAINT work_relationship_onboarding_cases_pay_regime_check
    CHECK (pay_regime_snapshot IN ('chile', 'international', 'unknown')),
  CONSTRAINT work_relationship_onboarding_cases_payroll_via_check
    CHECK (payroll_via_snapshot IN ('internal', 'deel', 'none', 'unknown')),
  CONSTRAINT work_relationship_onboarding_cases_start_type_check
    CHECK (start_type IN ('new_hire', 'rehire', 'relationship_transition', 'contractor_start', 'eor_start', 'identity_only', 'other')),
  CONSTRAINT work_relationship_onboarding_cases_source_check
    CHECK (source IN ('manual_hr', 'people', 'scim', 'admin', 'hiring_handoff', 'external_provider', 'legacy_checklist', 'system')),
  CONSTRAINT work_relationship_onboarding_cases_status_check
    CHECK (status IN ('draft', 'needs_review', 'approved', 'scheduled', 'blocked', 'active', 'cancelled')),
  CONSTRAINT work_relationship_onboarding_cases_rule_lane_check
    CHECK (rule_lane IN ('internal_payroll', 'external_payroll', 'non_payroll', 'identity_only', 'relationship_transition', 'unknown')),
  CONSTRAINT work_relationship_onboarding_cases_execution_mode_check
    CHECK (greenhouse_execution_mode IN ('full', 'partial', 'informational')),
  CONSTRAINT work_relationship_onboarding_cases_blocked_reason_check
    CHECK (status <> 'blocked' OR blocked_reason IS NOT NULL),
  CONSTRAINT work_relationship_onboarding_cases_cancelled_at_check
    CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL),
  CONSTRAINT work_relationship_onboarding_cases_activated_at_check
    CHECK (status <> 'active' OR activated_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS work_relationship_onboarding_cases_open_relationship_uidx
  ON greenhouse_hr.work_relationship_onboarding_cases (person_legal_entity_relationship_id)
  WHERE person_legal_entity_relationship_id IS NOT NULL
    AND status NOT IN ('active', 'cancelled');

CREATE UNIQUE INDEX IF NOT EXISTS work_relationship_onboarding_cases_open_member_uidx
  ON greenhouse_hr.work_relationship_onboarding_cases (member_id)
  WHERE person_legal_entity_relationship_id IS NULL
    AND member_id IS NOT NULL
    AND status NOT IN ('active', 'cancelled');

CREATE INDEX IF NOT EXISTS work_relationship_onboarding_cases_member_status_idx
  ON greenhouse_hr.work_relationship_onboarding_cases (member_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS work_relationship_onboarding_cases_profile_status_idx
  ON greenhouse_hr.work_relationship_onboarding_cases (profile_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS work_relationship_onboarding_cases_start_date_idx
  ON greenhouse_hr.work_relationship_onboarding_cases (start_date, status);

CREATE INDEX IF NOT EXISTS work_relationship_onboarding_cases_rule_lane_idx
  ON greenhouse_hr.work_relationship_onboarding_cases (rule_lane, status);

CREATE TABLE IF NOT EXISTS greenhouse_hr.work_relationship_onboarding_case_events (
  event_id TEXT PRIMARY KEY,
  onboarding_case_id TEXT NOT NULL REFERENCES greenhouse_hr.work_relationship_onboarding_cases(onboarding_case_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_user_id TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'system',
  reason TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS work_relationship_onboarding_case_events_case_created_idx
  ON greenhouse_hr.work_relationship_onboarding_case_events (onboarding_case_id, created_at DESC);

ALTER TABLE greenhouse_hr.onboarding_instances
  ADD COLUMN IF NOT EXISTS onboarding_case_id TEXT REFERENCES greenhouse_hr.work_relationship_onboarding_cases(onboarding_case_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS onboarding_instances_onboarding_case_id_idx
  ON greenhouse_hr.onboarding_instances (onboarding_case_id);

DROP TRIGGER IF EXISTS touch_work_relationship_onboarding_cases_updated_at
  ON greenhouse_hr.work_relationship_onboarding_cases;

CREATE TRIGGER touch_work_relationship_onboarding_cases_updated_at
  BEFORE UPDATE ON greenhouse_hr.work_relationship_onboarding_cases
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.touch_onboarding_updated_at();

GRANT SELECT, INSERT, UPDATE ON greenhouse_hr.work_relationship_onboarding_cases TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_hr.work_relationship_onboarding_case_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_hr.work_relationship_onboarding_cases TO greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_hr.work_relationship_onboarding_case_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE ON greenhouse_hr.work_relationship_onboarding_cases TO greenhouse_migrator;
GRANT SELECT, INSERT ON greenhouse_hr.work_relationship_onboarding_case_events TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_hr.work_relationship_onboarding_cases IS
  'Canonical case aggregate for starting a work relationship. HRIS onboarding_instances are operational children, not the source of truth.';

COMMENT ON COLUMN greenhouse_hr.onboarding_instances.onboarding_case_id IS
  'Optional parent WorkRelationshipOnboardingCase. Added by TASK-875 without changing checklist lifecycle.';

-- Down Migration

DROP TRIGGER IF EXISTS touch_work_relationship_onboarding_cases_updated_at ON greenhouse_hr.work_relationship_onboarding_cases;

DROP INDEX IF EXISTS greenhouse_hr.onboarding_instances_onboarding_case_id_idx;

ALTER TABLE greenhouse_hr.onboarding_instances
  DROP COLUMN IF EXISTS onboarding_case_id;

DROP INDEX IF EXISTS greenhouse_hr.work_relationship_onboarding_case_events_case_created_idx;

DROP TABLE IF EXISTS greenhouse_hr.work_relationship_onboarding_case_events;

DROP INDEX IF EXISTS greenhouse_hr.work_relationship_onboarding_cases_rule_lane_idx;
DROP INDEX IF EXISTS greenhouse_hr.work_relationship_onboarding_cases_start_date_idx;
DROP INDEX IF EXISTS greenhouse_hr.work_relationship_onboarding_cases_profile_status_idx;
DROP INDEX IF EXISTS greenhouse_hr.work_relationship_onboarding_cases_member_status_idx;
DROP INDEX IF EXISTS greenhouse_hr.work_relationship_onboarding_cases_open_member_uidx;
DROP INDEX IF EXISTS greenhouse_hr.work_relationship_onboarding_cases_open_relationship_uidx;

DROP TABLE IF EXISTS greenhouse_hr.work_relationship_onboarding_cases;
