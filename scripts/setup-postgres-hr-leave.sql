CREATE SCHEMA IF NOT EXISTS greenhouse_hr;

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_types (
  leave_type_code TEXT PRIMARY KEY,
  leave_type_name TEXT NOT NULL,
  description TEXT,
  default_annual_allowance_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  color_token TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_policies (
  policy_id TEXT PRIMARY KEY,
  leave_type_code TEXT NOT NULL REFERENCES greenhouse_hr.leave_types(leave_type_code) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  accrual_type TEXT NOT NULL DEFAULT 'annual_fixed'
    CHECK (accrual_type IN ('annual_fixed', 'monthly_accrual', 'unlimited', 'custom')),
  annual_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_carry_over_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  min_advance_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_consecutive_days NUMERIC(10, 2),
  min_continuous_days NUMERIC(10, 2),
  max_accumulation_periods NUMERIC(10, 2),
  progressive_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  progressive_base_years INTEGER NOT NULL DEFAULT 10,
  progressive_interval_years INTEGER NOT NULL DEFAULT 3,
  progressive_max_extra_days INTEGER NOT NULL DEFAULT 10,
  applicable_employment_types TEXT[] NOT NULL DEFAULT '{}',
  applicable_pay_regimes TEXT[] NOT NULL DEFAULT '{}',
  applicable_contract_types TEXT[] NOT NULL DEFAULT '{}',
  applicable_payroll_vias TEXT[] NOT NULL DEFAULT '{}',
  allow_negative_balance BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_balances (
  balance_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  leave_type_code TEXT NOT NULL REFERENCES greenhouse_hr.leave_types(leave_type_code),
  year INTEGER NOT NULL,
  allowance_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  progressive_extra_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  carried_over_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  adjustment_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  accumulated_periods NUMERIC(10, 2) NOT NULL DEFAULT 0,
  used_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reserved_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  updated_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_balances_member_type_year_unique UNIQUE (member_id, leave_type_code, year)
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_requests (
  request_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  leave_type_code TEXT NOT NULL REFERENCES greenhouse_hr.leave_types(leave_type_code),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_period TEXT NOT NULL DEFAULT 'full_day' CHECK (start_period IN ('full_day', 'morning', 'afternoon')),
  end_period TEXT NOT NULL DEFAULT 'full_day' CHECK (end_period IN ('full_day', 'morning', 'afternoon')),
  requested_days NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_supervisor', 'pending_hr', 'approved', 'rejected', 'cancelled')),
  reason TEXT,
  attachment_url TEXT,
  supervisor_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  hr_reviewer_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  notes TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  source_kind TEXT NOT NULL DEFAULT 'request' CHECK (source_kind IN ('request', 'admin_backfill')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_request_actions (
  action_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES greenhouse_hr.leave_requests(request_id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'cancel')),
  actor_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  actor_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  actor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_balance_adjustments (
  adjustment_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  leave_type_code TEXT NOT NULL REFERENCES greenhouse_hr.leave_types(leave_type_code),
  year INTEGER NOT NULL,
  days_delta NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'manual_adjustment'
    CHECK (source_kind IN ('manual_adjustment', 'manual_adjustment_reversal')),
  notes TEXT,
  metadata_json JSONB,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reversed_at TIMESTAMPTZ,
  reversed_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  reversal_of_adjustment_id TEXT REFERENCES greenhouse_hr.leave_balance_adjustments(adjustment_id)
);

ALTER TABLE greenhouse_core.members
  ADD COLUMN IF NOT EXISTS prior_work_years NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE greenhouse_hr.leave_balances
  ADD COLUMN IF NOT EXISTS progressive_extra_days NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE greenhouse_hr.leave_balances
  ADD COLUMN IF NOT EXISTS adjustment_days NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE greenhouse_hr.leave_balances
  ADD COLUMN IF NOT EXISTS accumulated_periods NUMERIC(10, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS leave_balances_member_year_idx
  ON greenhouse_hr.leave_balances (member_id, year);

CREATE INDEX IF NOT EXISTS leave_balances_type_year_idx
  ON greenhouse_hr.leave_balances (leave_type_code, year);

CREATE INDEX IF NOT EXISTS leave_policies_leave_type_idx
  ON greenhouse_hr.leave_policies (leave_type_code, active);

CREATE INDEX IF NOT EXISTS leave_requests_member_created_idx
  ON greenhouse_hr.leave_requests (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS leave_requests_supervisor_status_idx
  ON greenhouse_hr.leave_requests (supervisor_member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS leave_requests_status_start_idx
  ON greenhouse_hr.leave_requests (status, start_date DESC);

CREATE INDEX IF NOT EXISTS leave_request_actions_request_idx
  ON greenhouse_hr.leave_request_actions (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS leave_balance_adjustments_member_year_idx
  ON greenhouse_hr.leave_balance_adjustments (member_id, year, created_at DESC);

CREATE INDEX IF NOT EXISTS leave_balance_adjustments_type_year_idx
  ON greenhouse_hr.leave_balance_adjustments (leave_type_code, year, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS leave_balance_adjustments_reversal_unique
  ON greenhouse_hr.leave_balance_adjustments (reversal_of_adjustment_id)
  WHERE reversal_of_adjustment_id IS NOT NULL;

INSERT INTO greenhouse_hr.leave_types (
  leave_type_code,
  leave_type_name,
  description,
  default_annual_allowance_days,
  requires_attachment,
  is_paid,
  color_token,
  active
)
VALUES
  ('vacation', 'Vacaciones', 'Vacaciones anuales pagadas.', 15, FALSE, TRUE, 'success', TRUE),
  ('floating_holiday', 'Día libre flotante', 'Día libre remunerado otorgado por política interna.', 1, FALSE, TRUE, 'info', TRUE),
  ('bereavement', 'Permiso por duelo', 'Permiso remunerado breve por fallecimiento de familiar.', 3, FALSE, TRUE, 'dark', TRUE),
  ('civic_duty', 'Permiso por deber cívico', 'Permiso remunerado por deberes cívicos o comparecencias obligatorias.', 2, TRUE, TRUE, 'primary', TRUE),
  ('parental', 'Permiso parental', 'Permiso prolongado por maternidad, paternidad o cuidado parental; no remunerado por defecto en la política base.', 0, TRUE, FALSE, 'warning', TRUE),
  ('study', 'Permiso por estudio', 'Permiso por formación, exámenes o actividades académicas; no remunerado por defecto.', 0, FALSE, FALSE, 'info', TRUE),
  ('personal', 'Permiso personal', 'Permiso por gestión personal sin goce de sueldo.', 0, FALSE, FALSE, 'secondary', TRUE),
  ('personal_unpaid', 'Permiso personal no remunerado', 'Alias legacy para permiso personal sin goce de sueldo.', 0, FALSE, FALSE, 'secondary', FALSE),
  ('medical', 'Permiso médico / cita médica', 'Permiso breve remunerado por atención o control médico justificado.', 0, TRUE, TRUE, 'warning', TRUE),
  ('unpaid', 'Permiso sin goce', 'Ausencia sin goce de sueldo.', 0, FALSE, FALSE, 'secondary', TRUE)
ON CONFLICT (leave_type_code) DO UPDATE
SET
  leave_type_name = EXCLUDED.leave_type_name,
  description = EXCLUDED.description,
  default_annual_allowance_days = EXCLUDED.default_annual_allowance_days,
  requires_attachment = EXCLUDED.requires_attachment,
  is_paid = EXCLUDED.is_paid,
  color_token = EXCLUDED.color_token,
  active = EXCLUDED.active,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO greenhouse_hr.leave_policies (
  policy_id,
  leave_type_code,
  policy_name,
  accrual_type,
  annual_days,
  max_carry_over_days,
  requires_approval,
  min_advance_days,
  max_consecutive_days,
  min_continuous_days,
  max_accumulation_periods,
  progressive_enabled,
  progressive_base_years,
  progressive_interval_years,
  progressive_max_extra_days,
  applicable_employment_types,
  applicable_pay_regimes,
  applicable_contract_types,
  applicable_payroll_vias,
  allow_negative_balance,
  active
)
VALUES
  ('policy-vacation-chile', 'vacation', 'Vacaciones Chile dependientes', 'annual_fixed', 15, 5, TRUE, 7, 15, 5, 2, TRUE, 10, 3, 10, ARRAY['full_time'], ARRAY['chile'], ARRAY['indefinido', 'plazo_fijo'], ARRAY['internal'], FALSE, TRUE),
  ('policy-vacation-default', 'vacation', 'Vacaciones base portal', 'annual_fixed', 15, 0, TRUE, 7, 15, 5, 1, FALSE, 10, 3, 10, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], FALSE, TRUE),
  ('policy-floating-holiday-default', 'floating_holiday', 'Día libre flotante', 'annual_fixed', 1, 0, TRUE, 2, 1, 1, 0, FALSE, 10, 3, 10, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], FALSE, TRUE),
  ('policy-bereavement-default', 'bereavement', 'Permiso por duelo', 'annual_fixed', 3, 0, TRUE, 0, 3, 1, 0, FALSE, 10, 3, 10, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], FALSE, TRUE),
  ('policy-civic-duty-default', 'civic_duty', 'Permiso por deber cívico', 'annual_fixed', 2, 0, TRUE, 0, 2, 1, 0, FALSE, 10, 3, 10, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], FALSE, TRUE),
  ('policy-parental-default', 'parental', 'Permiso parental extendido', 'custom', 0, 0, TRUE, 0, NULL, NULL, NULL, FALSE, 10, 3, 10, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE, TRUE),
  ('policy-study-default', 'study', 'Permiso por estudio', 'custom', 0, 0, TRUE, 1.5, NULL, NULL, NULL, FALSE, 10, 3, 10, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE, TRUE),
  ('policy-personal-default', 'personal', 'Permiso personal', 'custom', 0, 0, TRUE, 1, NULL, NULL, NULL, FALSE, 10, 3, 10, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE, TRUE),
  ('policy-medical-default', 'medical', 'Permiso médico', 'custom', 0, 0, TRUE, 0, NULL, NULL, NULL, FALSE, 10, 3, 10, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE, TRUE),
  ('policy-unpaid-default', 'unpaid', 'Permiso sin goce', 'custom', 0, 0, TRUE, 2, NULL, NULL, NULL, FALSE, 10, 3, 10, ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[], TRUE, TRUE)
ON CONFLICT (policy_id) DO UPDATE
SET
  leave_type_code = EXCLUDED.leave_type_code,
  policy_name = EXCLUDED.policy_name,
  accrual_type = EXCLUDED.accrual_type,
  annual_days = EXCLUDED.annual_days,
  max_carry_over_days = EXCLUDED.max_carry_over_days,
  requires_approval = EXCLUDED.requires_approval,
  min_advance_days = EXCLUDED.min_advance_days,
  max_consecutive_days = EXCLUDED.max_consecutive_days,
  min_continuous_days = EXCLUDED.min_continuous_days,
  max_accumulation_periods = EXCLUDED.max_accumulation_periods,
  progressive_enabled = EXCLUDED.progressive_enabled,
  progressive_base_years = EXCLUDED.progressive_base_years,
  progressive_interval_years = EXCLUDED.progressive_interval_years,
  progressive_max_extra_days = EXCLUDED.progressive_max_extra_days,
  applicable_employment_types = EXCLUDED.applicable_employment_types,
  applicable_pay_regimes = EXCLUDED.applicable_pay_regimes,
  applicable_contract_types = EXCLUDED.applicable_contract_types,
  applicable_payroll_vias = EXCLUDED.applicable_payroll_vias,
  allow_negative_balance = EXCLUDED.allow_negative_balance,
  active = EXCLUDED.active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- Serving view: member_leave_360
-- Combines canonical member identity with current-year leave
-- balances and recent request counts.
-- ============================================================

CREATE OR REPLACE VIEW greenhouse_serving.member_leave_360 AS
SELECT
  m.member_id,
  m.display_name,
  m.primary_email,
  m.status AS member_status,
  m.active AS member_active,
  d.name AS department_name,
  mgr.member_id AS supervisor_member_id,
  mgr.display_name AS supervisor_name,
  COALESCE(bal.vacation_allowance, 0) AS vacation_allowance,
  COALESCE(bal.vacation_progressive, 0) AS vacation_progressive,
  COALESCE(bal.vacation_used, 0) AS vacation_used,
  COALESCE(bal.vacation_reserved, 0) AS vacation_reserved,
  COALESCE(bal.vacation_allowance, 0)
    + COALESCE(bal.vacation_progressive, 0)
    + COALESCE(bal.vacation_carried, 0)
    + COALESCE(bal.vacation_adjustment, 0)
    - COALESCE(bal.vacation_used, 0)
    - COALESCE(bal.vacation_reserved, 0) AS vacation_available,
  COALESCE(req.pending_count, 0) AS pending_requests,
  COALESCE(req.approved_count, 0) AS approved_requests_this_year,
  COALESCE(req.total_approved_days, 0) AS total_approved_days_this_year
FROM greenhouse_core.members m
LEFT JOIN greenhouse_core.departments d ON d.department_id = m.department_id
LEFT JOIN greenhouse_core.members mgr ON mgr.member_id = m.reports_to_member_id
LEFT JOIN LATERAL (
  SELECT
    SUM(allowance_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_allowance,
    SUM(progressive_extra_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_progressive,
    SUM(carried_over_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_carried,
    SUM(adjustment_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_adjustment,
    SUM(used_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_used,
    SUM(reserved_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_reserved
  FROM greenhouse_hr.leave_balances lb
  WHERE lb.member_id = m.member_id
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
) bal ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE status IN ('pending_supervisor', 'pending_hr')) AS pending_count,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
    COALESCE(SUM(requested_days) FILTER (WHERE status = 'approved'), 0) AS total_approved_days
  FROM greenhouse_hr.leave_requests lr
  WHERE lr.member_id = m.member_id
    AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
) req ON TRUE
WHERE m.active = TRUE;

-- Ensure serving view is accessible
GRANT SELECT ON greenhouse_serving.member_leave_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.member_leave_360 TO greenhouse_migrator;

-- ============================================================
-- Grants
-- ============================================================

GRANT USAGE ON SCHEMA greenhouse_hr TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_hr TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_hr TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA greenhouse_hr TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_hr
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_hr
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator;
