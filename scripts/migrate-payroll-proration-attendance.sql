-- Additive migration: bonus proration + attendance columns
-- Safe to re-run (IF NOT EXISTS on all columns)

DO $$
BEGIN
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
  (
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
VALUES
  ('default', 89.0, 3.0, 70.0, 1.70, 2.00, 0.8000, '2026-04-01', CURRENT_TIMESTAMP)
ON CONFLICT (config_id, effective_from) DO UPDATE
SET
  otd_threshold = EXCLUDED.otd_threshold,
  rpa_threshold = EXCLUDED.rpa_threshold,
  otd_floor = EXCLUDED.otd_floor,
  rpa_full_payout_threshold = EXCLUDED.rpa_full_payout_threshold,
  rpa_soft_band_end = EXCLUDED.rpa_soft_band_end,
  rpa_soft_band_floor_factor = EXCLUDED.rpa_soft_band_floor_factor;
