-- ============================================================
-- Greenhouse Payroll — PostgreSQL Schema (greenhouse_payroll)
-- ============================================================
-- Domain extension schema for the Payroll module.
-- Follows the 360 canonical model:
--   - member_id   → greenhouse_core.members(member_id)
--   - user IDs    → greenhouse_core.client_users(user_id)
--   - Outbox      → greenhouse_sync.outbox_events
--   - Serving     → greenhouse_serving.member_payroll_360
--
-- Pattern replicated from: greenhouse_hr (Leave)
-- Reference: GREENHOUSE_POSTGRES_CANONICAL_360_V1.md
-- ============================================================

CREATE SCHEMA IF NOT EXISTS greenhouse_payroll;

-- ------------------------------------------------------------
-- 1. compensation_versions
--    Tracks salary/compensation history per collaborator.
--    Each version has an effective window [effective_from, effective_to].
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_payroll.compensation_versions (
  version_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  pay_regime TEXT NOT NULL CHECK (pay_regime IN ('chile', 'international')),
  currency TEXT NOT NULL CHECK (currency IN ('CLP', 'USD')),
  base_salary NUMERIC(14, 2) NOT NULL,
  remote_allowance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fixed_bonus_label TEXT,
  fixed_bonus_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_otd_min NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_otd_max NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_rpa_min NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_rpa_max NUMERIC(14, 2) NOT NULL DEFAULT 0,
  afp_name TEXT,
  afp_rate NUMERIC(6, 4),
  health_system TEXT CHECK (health_system IS NULL OR health_system IN ('fonasa', 'isapre')),
  health_plan_uf NUMERIC(10, 4),
  unemployment_rate NUMERIC(6, 4),
  contract_type TEXT NOT NULL DEFAULT 'indefinido' CHECK (contract_type IN ('indefinido', 'plazo_fijo')),
  has_apv BOOLEAN NOT NULL DEFAULT FALSE,
  apv_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  change_reason TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT compensation_member_effective_unique UNIQUE (member_id, effective_from)
);

-- ------------------------------------------------------------
-- 2. payroll_periods
--    Monthly payroll processing periods with lifecycle states.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_periods (
  period_id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'exported')),
  calculated_at TIMESTAMPTZ,
  calculated_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  approved_at TIMESTAMPTZ,
  approved_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  exported_at TIMESTAMPTZ,
  uf_value NUMERIC(10, 2),
  tax_table_version TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payroll_periods_year_month_unique UNIQUE (year, month)
);

-- ------------------------------------------------------------
-- 3. payroll_entries
--    Per-member calculation for each payroll period.
--    Snapshot of compensation + KPIs + deductions at calc time.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_entries (
  entry_id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  compensation_version_id TEXT NOT NULL REFERENCES greenhouse_payroll.compensation_versions(version_id),

  -- Snapshot: compensation at calculation time
  pay_regime TEXT NOT NULL CHECK (pay_regime IN ('chile', 'international')),
  currency TEXT NOT NULL CHECK (currency IN ('CLP', 'USD')),
  base_salary NUMERIC(14, 2) NOT NULL,
  remote_allowance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fixed_bonus_label TEXT,
  fixed_bonus_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,

  -- Snapshot: member display name for exports/history (Rule 6 — secondary)
  member_display_name TEXT,

  -- KPI data (sourced externally — Notion/delivery, not owned by Payroll)
  kpi_otd_percent NUMERIC(6, 2),
  kpi_rpa_avg NUMERIC(6, 2),
  kpi_otd_qualifies BOOLEAN,
  kpi_rpa_qualifies BOOLEAN,
  kpi_tasks_completed INTEGER,
  kpi_data_source TEXT DEFAULT 'notion_ops',

  -- Bonus calculation
  bonus_otd_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_rpa_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_other_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_other_description TEXT,
  gross_total NUMERIC(14, 2) NOT NULL,

  -- Chile-specific deductions
  chile_afp_name TEXT,
  chile_afp_rate NUMERIC(6, 4),
  chile_afp_amount NUMERIC(14, 2),
  chile_health_system TEXT,
  chile_health_amount NUMERIC(14, 2),
  chile_unemployment_rate NUMERIC(6, 4),
  chile_unemployment_amount NUMERIC(14, 2),
  chile_taxable_base NUMERIC(14, 2),
  chile_tax_amount NUMERIC(14, 2),
  chile_apv_amount NUMERIC(14, 2),
  chile_uf_value NUMERIC(10, 2),
  chile_total_deductions NUMERIC(14, 2),

  -- Net totals
  net_total_calculated NUMERIC(14, 2),
  net_total_override NUMERIC(14, 2),
  net_total NUMERIC(14, 2) NOT NULL,
  manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  manual_override_note TEXT,

  -- Bonus proration factors (0.0 to 1.0)
  bonus_otd_proration_factor NUMERIC(6, 4),
  bonus_rpa_proration_factor NUMERIC(6, 4),

  -- Attendance snapshot
  working_days_in_period INTEGER,
  days_present INTEGER,
  days_absent INTEGER,
  days_on_leave INTEGER,
  days_on_unpaid_leave INTEGER,
  adjusted_base_salary NUMERIC(14, 2),
  adjusted_remote_allowance NUMERIC(14, 2),
  adjusted_fixed_bonus_amount NUMERIC(14, 2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payroll_entries_period_member_unique UNIQUE (period_id, member_id)
);

-- ------------------------------------------------------------
-- 4. payroll_bonus_config
--    Global bonus qualification thresholds.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_bonus_config (
  config_id TEXT NOT NULL,
  otd_threshold NUMERIC(6, 2) NOT NULL,
  rpa_threshold NUMERIC(6, 2) NOT NULL,
  otd_floor NUMERIC(6, 2) NOT NULL DEFAULT 70,
  rpa_full_payout_threshold NUMERIC(6, 2) NOT NULL DEFAULT 1.70,
  rpa_soft_band_end NUMERIC(6, 2) NOT NULL DEFAULT 2.00,
  rpa_soft_band_floor_factor NUMERIC(6, 4) NOT NULL DEFAULT 0.8000,
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (config_id, effective_from)
);

-- ------------------------------------------------------------
-- 5. projected_payroll_promotions
--    Audit trail connecting projected payroll cuts with official payroll recalculations.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_payroll.projected_payroll_promotions (
  promotion_id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  projection_mode TEXT NOT NULL CHECK (projection_mode IN ('actual_to_date', 'projected_month_end')),
  as_of_date DATE NOT NULL,
  source_snapshot_count INTEGER NOT NULL DEFAULT 0,
  promoted_entry_count INTEGER NOT NULL DEFAULT 0,
  source_period_status TEXT,
  actor_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  actor_identifier TEXT,
  promotion_status TEXT NOT NULL DEFAULT 'started' CHECK (promotion_status IN ('started', 'completed', 'failed')),
  promoted_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indexes
-- ============================================================

-- Compensation: lookup by member, temporal queries
CREATE INDEX IF NOT EXISTS comp_versions_member_effective_idx
  ON greenhouse_payroll.compensation_versions (member_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS comp_versions_current_idx
  ON greenhouse_payroll.compensation_versions (is_current) WHERE is_current = TRUE;

-- Periods: chronological listing
CREATE INDEX IF NOT EXISTS payroll_periods_year_month_idx
  ON greenhouse_payroll.payroll_periods (year DESC, month DESC);

-- Entries: by period, by member
CREATE INDEX IF NOT EXISTS payroll_entries_period_idx
  ON greenhouse_payroll.payroll_entries (period_id);

CREATE INDEX IF NOT EXISTS payroll_entries_member_idx
  ON greenhouse_payroll.payroll_entries (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS projected_payroll_promotions_period_idx
  ON greenhouse_payroll.projected_payroll_promotions (period_year DESC, period_month DESC, projection_mode);

-- ============================================================
-- Seed data
-- ============================================================

INSERT INTO greenhouse_payroll.payroll_bonus_config (
  config_id,
  otd_threshold,
  rpa_threshold,
  otd_floor,
  rpa_full_payout_threshold,
  rpa_soft_band_end,
  rpa_soft_band_floor_factor,
  effective_from,
  created_at
)
VALUES ('default', 89.0, 3.0, 70.0, 1.70, 2.00, 0.8000, '2026-01-01', CURRENT_TIMESTAMP)
ON CONFLICT (config_id, effective_from) DO UPDATE
SET
  otd_threshold = EXCLUDED.otd_threshold,
  rpa_threshold = EXCLUDED.rpa_threshold,
  otd_floor = EXCLUDED.otd_floor,
  rpa_full_payout_threshold = EXCLUDED.rpa_full_payout_threshold,
  rpa_soft_band_end = EXCLUDED.rpa_soft_band_end,
  rpa_soft_band_floor_factor = EXCLUDED.rpa_soft_band_floor_factor;

-- New prorated bonus config effective 2026-04-01
INSERT INTO greenhouse_payroll.payroll_bonus_config (
  config_id,
  otd_threshold,
  rpa_threshold,
  otd_floor,
  rpa_full_payout_threshold,
  rpa_soft_band_end,
  rpa_soft_band_floor_factor,
  effective_from,
  created_at
)
VALUES ('default', 89.0, 3.0, 70.0, 1.70, 2.00, 0.8000, '2026-04-01', CURRENT_TIMESTAMP)
ON CONFLICT (config_id, effective_from) DO UPDATE
SET
  otd_threshold = EXCLUDED.otd_threshold,
  rpa_threshold = EXCLUDED.rpa_threshold,
  otd_floor = EXCLUDED.otd_floor,
  rpa_full_payout_threshold = EXCLUDED.rpa_full_payout_threshold,
  rpa_soft_band_end = EXCLUDED.rpa_soft_band_end,
  rpa_soft_band_floor_factor = EXCLUDED.rpa_soft_band_floor_factor;

-- ============================================================
-- Additive migration (for databases where tables already exist)
-- ============================================================
DO $$
BEGIN
  ALTER TABLE greenhouse_payroll.compensation_versions
    ADD COLUMN IF NOT EXISTS fixed_bonus_label TEXT;
  ALTER TABLE greenhouse_payroll.compensation_versions
    ADD COLUMN IF NOT EXISTS fixed_bonus_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

  -- bonus_config: otd_floor
  ALTER TABLE greenhouse_payroll.payroll_bonus_config
    ADD COLUMN IF NOT EXISTS otd_floor NUMERIC(6, 2) NOT NULL DEFAULT 70;
  ALTER TABLE greenhouse_payroll.payroll_bonus_config
    ADD COLUMN IF NOT EXISTS rpa_full_payout_threshold NUMERIC(6, 2) NOT NULL DEFAULT 1.70;
  ALTER TABLE greenhouse_payroll.payroll_bonus_config
    ADD COLUMN IF NOT EXISTS rpa_soft_band_end NUMERIC(6, 2) NOT NULL DEFAULT 2.00;
  ALTER TABLE greenhouse_payroll.payroll_bonus_config
    ADD COLUMN IF NOT EXISTS rpa_soft_band_floor_factor NUMERIC(6, 4) NOT NULL DEFAULT 0.8000;

  -- payroll_entries: proration + attendance columns
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS fixed_bonus_label TEXT;
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS fixed_bonus_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS bonus_otd_proration_factor NUMERIC(6, 4);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS bonus_rpa_proration_factor NUMERIC(6, 4);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS working_days_in_period INTEGER;
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS days_present INTEGER;
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS days_absent INTEGER;
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS days_on_leave INTEGER;
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS days_on_unpaid_leave INTEGER;
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS adjusted_base_salary NUMERIC(14, 2);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS adjusted_remote_allowance NUMERIC(14, 2);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS adjusted_fixed_bonus_amount NUMERIC(14, 2);
END $$;

-- ============================================================
-- Serving view: member_payroll_360
-- Combines canonical member identity with current compensation.
-- ============================================================

CREATE OR REPLACE VIEW greenhouse_serving.member_payroll_360 AS
SELECT
  m.member_id,
  m.display_name,
  m.primary_email,
  m.job_level,
  m.employment_type,
  m.status AS member_status,
  m.active AS member_active,
  d.name AS department_name,
  cv.version_id AS current_compensation_version_id,
  cv.pay_regime,
  cv.currency,
  cv.base_salary,
  cv.remote_allowance,
  cv.fixed_bonus_label,
  cv.fixed_bonus_amount,
  cv.contract_type,
  cv.effective_from AS compensation_effective_from,
  cv.effective_to AS compensation_effective_to,
  (SELECT COUNT(*) FROM greenhouse_payroll.compensation_versions cv2 WHERE cv2.member_id = m.member_id) AS total_compensation_versions,
  (SELECT COUNT(*) FROM greenhouse_payroll.payroll_entries pe WHERE pe.member_id = m.member_id) AS total_payroll_entries
FROM greenhouse_core.members m
LEFT JOIN greenhouse_core.departments d ON d.department_id = m.department_id
LEFT JOIN LATERAL (
  SELECT *
  FROM greenhouse_payroll.compensation_versions cv_inner
  WHERE cv_inner.member_id = m.member_id
    AND cv_inner.effective_from <= CURRENT_DATE
    AND (cv_inner.effective_to IS NULL OR cv_inner.effective_to >= CURRENT_DATE)
  ORDER BY cv_inner.effective_from DESC, cv_inner.version DESC
  LIMIT 1
) cv ON TRUE
WHERE m.active = TRUE;

-- ============================================================
-- Grants
-- ============================================================

GRANT USAGE ON SCHEMA greenhouse_payroll TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_payroll TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_payroll TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA greenhouse_payroll TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_payroll
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_payroll
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator;

-- Ensure serving view is accessible
GRANT SELECT ON greenhouse_serving.member_payroll_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.member_payroll_360 TO greenhouse_migrator;
