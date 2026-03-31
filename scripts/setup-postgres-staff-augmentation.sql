CREATE SCHEMA IF NOT EXISTS greenhouse_delivery;

ALTER TABLE greenhouse_core.client_team_assignments
  ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'internal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_team_assignments_assignment_type_check'
  ) THEN
    ALTER TABLE greenhouse_core.client_team_assignments
      ADD CONSTRAINT client_team_assignments_assignment_type_check
      CHECK (assignment_type IN ('internal', 'staff_augmentation'));
  END IF;
END $$;

INSERT INTO greenhouse_core.service_modules (module_id, module_code, module_name, business_line, description)
VALUES (
  'sm-staff-augmentation',
  'staff_augmentation',
  'Staff Augmentation',
  'reach',
  'Placements comerciales sobre assignments canónicos y delivery extendido.'
)
ON CONFLICT (module_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS greenhouse_delivery.staff_aug_placements (
  placement_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  assignment_id TEXT NOT NULL UNIQUE
    REFERENCES greenhouse_core.client_team_assignments(assignment_id) ON DELETE CASCADE,
  client_id TEXT NOT NULL
    REFERENCES greenhouse_core.clients(client_id) ON DELETE CASCADE,
  space_id TEXT REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  organization_id TEXT REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  member_id TEXT NOT NULL
    REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  provider_id TEXT REFERENCES greenhouse_core.providers(provider_id) ON DELETE SET NULL,
  service_module_assignment_id TEXT
    REFERENCES greenhouse_core.client_service_modules(assignment_id) ON DELETE SET NULL,
  business_unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pipeline'
    CHECK (status IN ('pipeline', 'onboarding', 'active', 'renewal_pending', 'renewed', 'ended')),
  lifecycle_stage TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_stage IN ('draft', 'contracting', 'client_setup', 'live', 'closed')),
  provider_relationship_type TEXT NOT NULL DEFAULT 'direct'
    CHECK (provider_relationship_type IN ('direct', 'eor', 'staffing_partner', 'other')),
  pay_regime_snapshot TEXT,
  contract_type_snapshot TEXT,
  compensation_version_id_snapshot TEXT,
  cost_rate_amount NUMERIC(14,2),
  cost_rate_currency TEXT,
  cost_rate_source TEXT NOT NULL DEFAULT 'payroll_snapshot'
    CHECK (cost_rate_source IN ('payroll_snapshot', 'manual')),
  billing_rate_amount NUMERIC(14,2),
  billing_rate_currency TEXT NOT NULL DEFAULT 'USD',
  billing_frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_frequency IN ('monthly', 'quarterly', 'annual')),
  external_contract_ref TEXT,
  legal_entity TEXT,
  contractor_country TEXT,
  client_reporting_to TEXT,
  client_communication_channel TEXT,
  client_tools TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  required_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  matched_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  placement_notes TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  actual_end_date DATE,
  renewal_alert_days INTEGER NOT NULL DEFAULT 60,
  sla_availability_percent NUMERIC(5,2),
  sla_response_hours INTEGER,
  sla_notice_period_days INTEGER NOT NULL DEFAULT 30,
  latest_snapshot_id TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  updated_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS staff_aug_placements_member_idx
  ON greenhouse_delivery.staff_aug_placements (member_id, status);

CREATE INDEX IF NOT EXISTS staff_aug_placements_client_idx
  ON greenhouse_delivery.staff_aug_placements (client_id, status);

CREATE INDEX IF NOT EXISTS staff_aug_placements_provider_idx
  ON greenhouse_delivery.staff_aug_placements (provider_id);

CREATE INDEX IF NOT EXISTS staff_aug_placements_space_idx
  ON greenhouse_delivery.staff_aug_placements (space_id);

CREATE TABLE IF NOT EXISTS greenhouse_delivery.staff_aug_onboarding_items (
  onboarding_item_id TEXT PRIMARY KEY,
  placement_id TEXT NOT NULL
    REFERENCES greenhouse_delivery.staff_aug_placements(placement_id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'blocked', 'in_progress', 'done')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  blocker_note TEXT,
  verified_at TIMESTAMPTZ,
  verified_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (placement_id, item_key)
);

CREATE INDEX IF NOT EXISTS staff_aug_onboarding_items_placement_idx
  ON greenhouse_delivery.staff_aug_onboarding_items (placement_id, sort_order);

CREATE TABLE IF NOT EXISTS greenhouse_delivery.staff_aug_events (
  staff_aug_event_id TEXT PRIMARY KEY,
  placement_id TEXT NOT NULL
    REFERENCES greenhouse_delivery.staff_aug_placements(placement_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS staff_aug_events_placement_idx
  ON greenhouse_delivery.staff_aug_events (placement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_serving.staff_aug_placement_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  placement_id TEXT NOT NULL
    REFERENCES greenhouse_delivery.staff_aug_placements(placement_id) ON DELETE CASCADE,
  assignment_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT,
  space_id TEXT,
  space_name TEXT,
  organization_id TEXT,
  organization_name TEXT,
  member_id TEXT NOT NULL,
  member_name TEXT,
  provider_id TEXT,
  provider_name TEXT,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_id TEXT NOT NULL,
  placement_status TEXT NOT NULL,
  billing_rate_amount NUMERIC(14,2),
  billing_rate_currency TEXT,
  projected_revenue_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost_rate_amount NUMERIC(14,2),
  cost_rate_currency TEXT,
  payroll_gross_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  payroll_employer_cost_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  commercial_loaded_cost_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  member_direct_expense_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  tooling_cost_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_margin_proxy_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_margin_proxy_pct NUMERIC(8,2),
  provider_tooling_snapshot_id TEXT,
  source_compensation_version_id TEXT,
  source_payroll_entry_id TEXT,
  snapshot_status TEXT NOT NULL DEFAULT 'partial'
    CHECK (snapshot_status IN ('partial', 'complete')),
  refresh_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (placement_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS staff_aug_snapshots_period_idx
  ON greenhouse_serving.staff_aug_placement_snapshots (period_year DESC, period_month DESC, placement_id);

GRANT USAGE ON SCHEMA greenhouse_delivery TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_delivery TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_delivery.staff_aug_placements TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_delivery.staff_aug_onboarding_items TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_delivery.staff_aug_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA greenhouse_delivery TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.staff_aug_placement_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_serving.staff_aug_placement_snapshots TO greenhouse_migrator;
