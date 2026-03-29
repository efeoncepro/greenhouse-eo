ALTER TABLE greenhouse_payroll.compensation_versions
  ADD COLUMN IF NOT EXISTS gratificacion_legal_mode TEXT;

UPDATE greenhouse_payroll.compensation_versions
SET gratificacion_legal_mode = CASE
  WHEN pay_regime = 'chile' THEN 'mensual_25pct'
  ELSE 'ninguna'
END
WHERE gratificacion_legal_mode IS NULL;

ALTER TABLE greenhouse_payroll.compensation_versions
  ALTER COLUMN gratificacion_legal_mode SET DEFAULT 'ninguna';

ALTER TABLE greenhouse_payroll.compensation_versions
  ALTER COLUMN gratificacion_legal_mode SET NOT NULL;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS chile_gratificacion_legal NUMERIC(14, 2);
