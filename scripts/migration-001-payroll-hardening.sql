-- ══════════════════════════════════════════════════════
-- TASK-001: Payroll Operational Hardening
-- ══════════════════════════════════════════════════════

-- 1. Add kpi_source_mode to entries (requires table owner)
DO $$ BEGIN
  ALTER TABLE greenhouse_payroll.payroll_entries ADD COLUMN IF NOT EXISTS kpi_source_mode TEXT;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skip: cannot alter payroll_entries — run as table owner to add kpi_source_mode';
END $$;

-- 2. Add calculation_diagnostics to periods (requires table owner)
DO $$ BEGIN
  ALTER TABLE greenhouse_payroll.payroll_periods ADD COLUMN IF NOT EXISTS calculation_diagnostics JSONB;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skip: cannot alter payroll_periods — run as table owner to add calculation_diagnostics';
END $$;

-- 3. Create attendance monthly snapshot table
CREATE TABLE IF NOT EXISTS greenhouse_payroll.attendance_monthly_snapshot (
  member_id         TEXT NOT NULL,
  period_year       INT NOT NULL,
  period_month      INT NOT NULL,
  working_days      INT NOT NULL DEFAULT 0,
  days_present      INT NOT NULL DEFAULT 0,
  days_absent       INT NOT NULL DEFAULT 0,
  days_on_leave     INT NOT NULL DEFAULT 0,
  days_on_unpaid_leave INT NOT NULL DEFAULT 0,
  days_holiday      INT NOT NULL DEFAULT 0,
  source            TEXT NOT NULL DEFAULT 'hybrid',
  snapshot_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_id, period_year, period_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.attendance_monthly_snapshot TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.attendance_monthly_snapshot TO greenhouse_ops;

-- 4. Chile tax brackets table
CREATE TABLE IF NOT EXISTS greenhouse_payroll.chile_tax_brackets (
  bracket_id        TEXT PRIMARY KEY,
  tax_table_version TEXT NOT NULL,
  bracket_order     INT NOT NULL,
  from_utm          NUMERIC(10,4) NOT NULL,
  to_utm            NUMERIC(10,4),
  rate              NUMERIC(6,4) NOT NULL,
  deduction_utm     NUMERIC(10,4) NOT NULL DEFAULT 0,
  effective_from    DATE NOT NULL,
  effective_to      DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_brackets_version
  ON greenhouse_payroll.chile_tax_brackets (tax_table_version, bracket_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.chile_tax_brackets TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_payroll.chile_tax_brackets TO greenhouse_ops;

-- 5. Seed current Chile tax brackets (2026 table — 8 brackets)
INSERT INTO greenhouse_payroll.chile_tax_brackets
  (bracket_id, tax_table_version, bracket_order, from_utm, to_utm, rate, deduction_utm, effective_from)
VALUES
  ('cl-2026-01', '2026-v1', 1, 0,      13.5,   0.0000, 0.0000, '2026-01-01'),
  ('cl-2026-02', '2026-v1', 2, 13.5,   30.0,   0.0400, 0.5400, '2026-01-01'),
  ('cl-2026-03', '2026-v1', 3, 30.0,   50.0,   0.0800, 1.7400, '2026-01-01'),
  ('cl-2026-04', '2026-v1', 4, 50.0,   70.0,   0.1350, 4.4900, '2026-01-01'),
  ('cl-2026-05', '2026-v1', 5, 70.0,   90.0,   0.2300, 11.1400, '2026-01-01'),
  ('cl-2026-06', '2026-v1', 6, 90.0,   120.0,  0.3040, 17.8000, '2026-01-01'),
  ('cl-2026-07', '2026-v1', 7, 120.0,  310.0,  0.3500, 23.3200, '2026-01-01'),
  ('cl-2026-08', '2026-v1', 8, 310.0,  NULL,   0.4000, 38.8200, '2026-01-01')
ON CONFLICT (bracket_id) DO NOTHING;
