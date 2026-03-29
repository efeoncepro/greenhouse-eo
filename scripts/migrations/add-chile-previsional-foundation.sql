-- ============================================================
-- Payroll Chile — Previsional Foundation Tables
-- ============================================================
-- These tables are intentionally additive and safe to apply in
-- environments where Payroll already exists.
--
-- Goals:
-- - Store Chile AFP rates per period (year/month) for canonical lookup.
-- - Store other period-level Previred indicators (SIS, topes, IMM, etc.)
--   in a forward-compatible table without forcing consumers yet.
-- ============================================================

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

GRANT USAGE ON SCHEMA greenhouse_payroll TO greenhouse_runtime;
GRANT SELECT ON greenhouse_payroll.chile_previred_indicators TO greenhouse_runtime;
GRANT INSERT, UPDATE, DELETE ON greenhouse_payroll.chile_previred_indicators TO greenhouse_runtime;
GRANT SELECT ON greenhouse_payroll.chile_afp_rates TO greenhouse_runtime;
GRANT INSERT, UPDATE, DELETE ON greenhouse_payroll.chile_afp_rates TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.chile_tax_brackets TO greenhouse_runtime;
