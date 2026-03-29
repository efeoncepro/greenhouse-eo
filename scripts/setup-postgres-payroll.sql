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
  colacion_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  movilizacion_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fixed_bonus_label TEXT,
  fixed_bonus_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_otd_min NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_otd_max NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_rpa_min NUMERIC(14, 2) NOT NULL DEFAULT 0,
  bonus_rpa_max NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gratificacion_legal_mode TEXT NOT NULL DEFAULT 'ninguna' CHECK (gratificacion_legal_mode IN ('mensual_25pct', 'anual_proporcional', 'ninguna')),
  afp_name TEXT,
  afp_rate NUMERIC(6, 4),
  afp_cotizacion_rate NUMERIC(6, 4),
  afp_comision_rate NUMERIC(6, 4),
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
  colacion_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  movilizacion_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
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
  chile_gratificacion_legal NUMERIC(14, 2),
  chile_colacion_amount NUMERIC(14, 2),
  chile_movilizacion_amount NUMERIC(14, 2),

  -- Chile-specific deductions
  chile_afp_name TEXT,
  chile_afp_rate NUMERIC(6, 4),
  chile_afp_amount NUMERIC(14, 2),
  chile_afp_cotizacion_amount NUMERIC(14, 2),
  chile_afp_comision_amount NUMERIC(14, 2),
  chile_health_system TEXT,
  chile_health_amount NUMERIC(14, 2),
  chile_health_obligatoria_amount NUMERIC(14, 2),
  chile_health_voluntaria_amount NUMERIC(14, 2),
  chile_employer_sis_amount NUMERIC(14, 2),
  chile_employer_cesantia_amount NUMERIC(14, 2),
  chile_employer_mutual_amount NUMERIC(14, 2),
  chile_employer_total_cost NUMERIC(14, 2),
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
  adjusted_colacion_amount NUMERIC(14, 2),
  adjusted_movilizacion_amount NUMERIC(14, 2),
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
-- 5. payroll_receipts
--    Stored PDF receipts generated from exported payroll periods.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_receipts (
  receipt_id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_entries(entry_id) ON DELETE CASCADE,
  period_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  pay_regime TEXT NOT NULL CHECK (pay_regime IN ('chile', 'international')),
  revision INTEGER NOT NULL DEFAULT 1,
  source_event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'generation_failed', 'email_sent', 'email_failed')),
  storage_bucket TEXT,
  storage_path TEXT,
  file_size_bytes INTEGER,
  generated_at TIMESTAMPTZ,
  generated_by TEXT,
  generation_error TEXT,
  email_recipient TEXT,
  email_sent_at TIMESTAMPTZ,
  email_delivery_id TEXT,
  email_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payroll_receipts_entry_revision_unique UNIQUE (entry_id, revision),
  CONSTRAINT payroll_receipts_source_event_entry_unique UNIQUE (source_event_id, entry_id)
);

CREATE INDEX IF NOT EXISTS payroll_receipts_period_idx
  ON greenhouse_payroll.payroll_receipts (period_id, revision DESC);

CREATE INDEX IF NOT EXISTS payroll_receipts_source_event_idx
  ON greenhouse_payroll.payroll_receipts (source_event_id, created_at DESC);

-- ------------------------------------------------------------
-- 6. payroll_export_packages
--    Persisted PDF/CSV artifacts for exported payroll periods.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_export_packages (
  period_id TEXT PRIMARY KEY REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  storage_bucket TEXT,
  pdf_storage_path TEXT,
  csv_storage_path TEXT,
  pdf_file_size_bytes INTEGER,
  csv_file_size_bytes INTEGER,
  pdf_template_version TEXT,
  csv_template_version TEXT,
  generated_at TIMESTAMPTZ,
  generated_by TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  delivery_attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  last_sent_by TEXT,
  last_email_delivery_id TEXT,
  last_send_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS payroll_export_packages_delivery_status_idx
  ON greenhouse_payroll.payroll_export_packages (delivery_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS payroll_export_packages_last_sent_idx
  ON greenhouse_payroll.payroll_export_packages (last_sent_at DESC, updated_at DESC);

-- ------------------------------------------------------------
-- 7. previred_period_indicators
--    Canonical monthly Chile previsional snapshot.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_payroll.previred_period_indicators (
  indicator_id TEXT PRIMARY KEY,
  indicator_date DATE NOT NULL,
  imm_value NUMERIC(14, 2) NOT NULL,
  sis_rate NUMERIC(6, 4) NOT NULL,
  unemployment_rate_indefinite NUMERIC(6, 4) NOT NULL,
  unemployment_rate_fixed_term NUMERIC(6, 4) NOT NULL,
  afp_top_unf NUMERIC(10, 2) NOT NULL,
  unemployment_top_unf NUMERIC(10, 2) NOT NULL,
  apv_top_unf NUMERIC(10, 2) NOT NULL DEFAULT 50,
  source TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT previred_period_indicators_unique UNIQUE (indicator_date)
);

-- ------------------------------------------------------------
-- 8. previred_afp_rates
--    AFP rate catalog by period and fund.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_payroll.previred_afp_rates (
  indicator_id TEXT PRIMARY KEY,
  indicator_date DATE NOT NULL,
  afp_code TEXT NOT NULL,
  afp_name TEXT NOT NULL,
  worker_rate NUMERIC(6, 4) NOT NULL,
  employer_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
  total_rate NUMERIC(6, 4) NOT NULL,
  source TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT previred_afp_rates_unique UNIQUE (indicator_date, afp_code)
);

-- ------------------------------------------------------------
-- 9. projected_payroll_promotions
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

-- ------------------------------------------------------------
-- 10. Chile previsional foundation (optional, forward-compatible)
-- ------------------------------------------------------------
-- These tables support cutting the Chile payroll engine off manual rates.
-- They are additive and do not block current Payroll usage.

CREATE TABLE IF NOT EXISTS greenhouse_payroll.chile_previred_indicators (
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  imm_clp NUMERIC(14, 2),
  sis_rate NUMERIC(6, 4),
  tope_afp_uf NUMERIC(10, 4),
  tope_cesantia_uf NUMERIC(10, 4),
  source TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (period_year, period_month)
);

CREATE INDEX IF NOT EXISTS chile_previred_indicators_period_idx
  ON greenhouse_payroll.chile_previred_indicators (period_year DESC, period_month DESC);

CREATE TABLE IF NOT EXISTS greenhouse_payroll.chile_afp_rates (
  afp_rate_id TEXT PRIMARY KEY,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  afp_name TEXT NOT NULL,
  total_rate NUMERIC(6, 4) NOT NULL,
  source TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chile_afp_rates_period_name_unique UNIQUE (period_year, period_month, afp_name)
);

CREATE INDEX IF NOT EXISTS chile_afp_rates_period_idx
  ON greenhouse_payroll.chile_afp_rates (period_year DESC, period_month DESC);

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

CREATE INDEX IF NOT EXISTS previred_period_indicators_date_idx
  ON greenhouse_payroll.previred_period_indicators (indicator_date DESC);

CREATE INDEX IF NOT EXISTS previred_afp_rates_date_code_idx
  ON greenhouse_payroll.previred_afp_rates (indicator_date DESC, afp_code);

CREATE INDEX IF NOT EXISTS projected_payroll_promotions_period_idx
  ON greenhouse_payroll.projected_payroll_promotions (period_year DESC, period_month DESC, projection_mode);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.projected_payroll_promotions TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.projected_payroll_promotions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.projected_payroll_promotions TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.projected_payroll_snapshots TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.projected_payroll_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.projected_payroll_snapshots TO greenhouse_migrator;

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

-- Seed canonical Previred baseline snapshots (current operational baseline)
INSERT INTO greenhouse_payroll.previred_period_indicators (
  indicator_id,
  indicator_date,
  imm_value,
  sis_rate,
  unemployment_rate_indefinite,
  unemployment_rate_fixed_term,
  afp_top_unf,
  unemployment_top_unf,
  apv_top_unf,
  source,
  source_url,
  created_at,
  updated_at
)
VALUES
  ('previred_2026-01-01', DATE '2026-01-01', 539000.00, 0.0154, 0.0060, 0.0300, 89.9, 135.1, 50.0, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2025/12/Indicadores-Previsionales-Previred-Diciembre-2025-1.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('previred_2026-02-01', DATE '2026-02-01', 539000.00, 0.0154, 0.0060, 0.0300, 90.0, 135.2, 50.0, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2026/01/Indicadores-Previsionales-Previred-Enero-2026.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('previred_2026-03-01', DATE '2026-03-01', 539000.00, 0.0154, 0.0060, 0.0300, 90.0, 135.2, 50.0, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2026/02/Indicadores-Previsionales-Previred-Febrero-2026-2.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (indicator_date) DO UPDATE
SET
  imm_value = EXCLUDED.imm_value,
  sis_rate = EXCLUDED.sis_rate,
  unemployment_rate_indefinite = EXCLUDED.unemployment_rate_indefinite,
  unemployment_rate_fixed_term = EXCLUDED.unemployment_rate_fixed_term,
  afp_top_unf = EXCLUDED.afp_top_unf,
  unemployment_top_unf = EXCLUDED.unemployment_top_unf,
  apv_top_unf = EXCLUDED.apv_top_unf,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO greenhouse_payroll.previred_afp_rates (
  indicator_id,
  indicator_date,
  afp_code,
  afp_name,
  worker_rate,
  employer_rate,
  total_rate,
  source,
  source_url,
  created_at,
  updated_at
)
VALUES
  ('previred_afp_2026-03-01_capital', DATE '2026-03-01', 'capital', 'Capital', 0.1144, 0.0010, 0.1154, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2026/02/Indicadores-Previsionales-Previred-Febrero-2026-2.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('previred_afp_2026-03-01_cuprum', DATE '2026-03-01', 'cuprum', 'Cuprum', 0.1144, 0.0010, 0.1154, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2026/02/Indicadores-Previsionales-Previred-Febrero-2026-2.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('previred_afp_2026-03-01_habitat', DATE '2026-03-01', 'habitat', 'Habitat', 0.1127, 0.0010, 0.1137, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2026/02/Indicadores-Previsionales-Previred-Febrero-2026-2.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('previred_afp_2026-03-01_planvital', DATE '2026-03-01', 'planvital', 'PlanVital', 0.1116, 0.0010, 0.1126, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2026/02/Indicadores-Previsionales-Previred-Febrero-2026-2.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('previred_afp_2026-03-01_provida', DATE '2026-03-01', 'provida', 'Provida', 0.1145, 0.0010, 0.1155, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2026/02/Indicadores-Previsionales-Previred-Febrero-2026-2.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('previred_afp_2026-03-01_modelo', DATE '2026-03-01', 'modelo', 'Modelo', 0.1058, 0.0010, 0.1068, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2026/02/Indicadores-Previsionales-Previred-Febrero-2026-2.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('previred_afp_2026-03-01_uno', DATE '2026-03-01', 'uno', 'Uno', 0.1046, 0.0010, 0.1056, 'previred_pdf', 'https://www.previred.com/wp-content/uploads/2026/02/Indicadores-Previsionales-Previred-Febrero-2026-2.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (indicator_date, afp_code) DO UPDATE
SET
  afp_name = EXCLUDED.afp_name,
  worker_rate = EXCLUDED.worker_rate,
  employer_rate = EXCLUDED.employer_rate,
  total_rate = EXCLUDED.total_rate,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  updated_at = CURRENT_TIMESTAMP;

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
    ADD COLUMN IF NOT EXISTS chile_health_obligatoria_amount NUMERIC(14, 2);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS chile_health_voluntaria_amount NUMERIC(14, 2);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS chile_employer_sis_amount NUMERIC(14, 2);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS chile_employer_cesantia_amount NUMERIC(14, 2);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS chile_employer_mutual_amount NUMERIC(14, 2);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS chile_employer_total_cost NUMERIC(14, 2);
  ALTER TABLE greenhouse_payroll.payroll_entries
    ADD COLUMN IF NOT EXISTS adjusted_fixed_bonus_amount NUMERIC(14, 2);

  CREATE TABLE IF NOT EXISTS greenhouse_payroll.previred_period_indicators (
    indicator_id TEXT PRIMARY KEY,
    indicator_date DATE NOT NULL,
    imm_value NUMERIC(14, 2) NOT NULL,
    sis_rate NUMERIC(6, 4) NOT NULL,
    unemployment_rate_indefinite NUMERIC(6, 4) NOT NULL,
    unemployment_rate_fixed_term NUMERIC(6, 4) NOT NULL,
    afp_top_unf NUMERIC(10, 2) NOT NULL,
    unemployment_top_unf NUMERIC(10, 2) NOT NULL,
    apv_top_unf NUMERIC(10, 2) NOT NULL DEFAULT 50,
    source TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT previred_period_indicators_unique UNIQUE (indicator_date)
  );

  CREATE TABLE IF NOT EXISTS greenhouse_payroll.previred_afp_rates (
    indicator_id TEXT PRIMARY KEY,
    indicator_date DATE NOT NULL,
    afp_code TEXT NOT NULL,
    afp_name TEXT NOT NULL,
    worker_rate NUMERIC(6, 4) NOT NULL,
    employer_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
    total_rate NUMERIC(6, 4) NOT NULL,
    source TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT previred_afp_rates_unique UNIQUE (indicator_date, afp_code)
  );
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
