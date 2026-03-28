-- Add Chile non-imponible allowances to payroll compensation and entries.

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD COLUMN IF NOT EXISTS colacion_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS movilizacion_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS colacion_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS movilizacion_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chile_colacion_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS chile_movilizacion_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS adjusted_colacion_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS adjusted_movilizacion_amount NUMERIC(14, 2);
