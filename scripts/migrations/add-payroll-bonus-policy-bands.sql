-- Expand payroll bonus policy config to support softer RpA payout bands.
-- Safe to re-run.

DO $$
BEGIN
  ALTER TABLE greenhouse_payroll.payroll_bonus_config
    ADD COLUMN IF NOT EXISTS otd_floor NUMERIC(6, 2) NOT NULL DEFAULT 70;
  ALTER TABLE greenhouse_payroll.payroll_bonus_config
    ADD COLUMN IF NOT EXISTS rpa_full_payout_threshold NUMERIC(6, 2) NOT NULL DEFAULT 1.70;
  ALTER TABLE greenhouse_payroll.payroll_bonus_config
    ADD COLUMN IF NOT EXISTS rpa_soft_band_end NUMERIC(6, 2) NOT NULL DEFAULT 2.00;
  ALTER TABLE greenhouse_payroll.payroll_bonus_config
    ADD COLUMN IF NOT EXISTS rpa_soft_band_floor_factor NUMERIC(6, 4) NOT NULL DEFAULT 0.8000;
END $$;

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
VALUES (
  'default',
  89.0,
  3.0,
  70.0,
  1.70,
  2.00,
  0.8000,
  '2026-03-01',
  CURRENT_TIMESTAMP
)
ON CONFLICT (config_id, effective_from) DO UPDATE
SET
  otd_threshold = EXCLUDED.otd_threshold,
  rpa_threshold = EXCLUDED.rpa_threshold,
  otd_floor = EXCLUDED.otd_floor,
  rpa_full_payout_threshold = EXCLUDED.rpa_full_payout_threshold,
  rpa_soft_band_end = EXCLUDED.rpa_soft_band_end,
  rpa_soft_band_floor_factor = EXCLUDED.rpa_soft_band_floor_factor;
