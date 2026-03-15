-- Additive migration: bonus proration + attendance columns
-- Safe to re-run (IF NOT EXISTS on all columns)

DO $$
BEGIN
  -- bonus_config: otd_floor
  ALTER TABLE greenhouse_payroll.payroll_bonus_config
    ADD COLUMN IF NOT EXISTS otd_floor NUMERIC(6, 2) NOT NULL DEFAULT 70;

  -- payroll_entries: proration + attendance columns
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
END $$;

-- Seed / update bonus config with new thresholds
INSERT INTO greenhouse_payroll.payroll_bonus_config
  (config_id, otd_threshold, rpa_threshold, otd_floor, effective_from, created_at)
VALUES
  ('default', 94.0, 3.0, 70.0, '2026-04-01', CURRENT_TIMESTAMP)
ON CONFLICT (config_id, effective_from) DO UPDATE
SET
  otd_threshold = EXCLUDED.otd_threshold,
  rpa_threshold = EXCLUDED.rpa_threshold,
  otd_floor = EXCLUDED.otd_floor;
