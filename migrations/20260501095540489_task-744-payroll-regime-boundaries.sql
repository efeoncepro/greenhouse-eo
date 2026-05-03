-- Up Migration

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS contract_type_snapshot TEXT;

UPDATE greenhouse_payroll.payroll_entries AS e
SET contract_type_snapshot = cv.contract_type
FROM greenhouse_payroll.compensation_versions AS cv
WHERE e.compensation_version_id = cv.version_id
  AND e.contract_type_snapshot IS NULL;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_contract_type_snapshot_check;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_contract_type_snapshot_check
  CHECK (
    contract_type_snapshot IS NULL
    OR contract_type_snapshot IN ('indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor')
  ) NOT VALID;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_honorarios_boundary_check;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_honorarios_boundary_check
  CHECK (
    contract_type_snapshot IS DISTINCT FROM 'honorarios'
    OR (
      payroll_via = 'internal'
      AND pay_regime = 'chile'
      AND sii_retention_rate IS NOT NULL
      AND sii_retention_amount IS NOT NULL
      AND chile_afp_name IS NULL
      AND chile_health_system IS NULL
      AND COALESCE(chile_afp_rate, 0) = 0
      AND COALESCE(chile_afp_amount, 0) = 0
      AND COALESCE(chile_afp_cotizacion_amount, 0) = 0
      AND COALESCE(chile_afp_comision_amount, 0) = 0
      AND COALESCE(chile_health_amount, 0) = 0
      AND COALESCE(chile_health_obligatoria_amount, 0) = 0
      AND COALESCE(chile_health_voluntaria_amount, 0) = 0
      AND COALESCE(chile_employer_sis_amount, 0) = 0
      AND COALESCE(chile_employer_cesantia_amount, 0) = 0
      AND COALESCE(chile_employer_mutual_amount, 0) = 0
      AND COALESCE(chile_employer_total_cost, 0) = 0
      AND COALESCE(chile_unemployment_rate, 0) = 0
      AND COALESCE(chile_unemployment_amount, 0) = 0
      AND COALESCE(chile_tax_amount, 0) = 0
      AND COALESCE(chile_apv_amount, 0) = 0
    )
  ) NOT VALID;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_international_boundary_check;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_international_boundary_check
  CHECK (
    NOT (pay_regime = 'international' OR payroll_via = 'deel')
    OR (
      COALESCE(sii_retention_rate, 0) = 0
      AND COALESCE(sii_retention_amount, 0) = 0
      AND chile_afp_name IS NULL
      AND chile_health_system IS NULL
      AND COALESCE(chile_afp_rate, 0) = 0
      AND COALESCE(chile_afp_amount, 0) = 0
      AND COALESCE(chile_afp_cotizacion_amount, 0) = 0
      AND COALESCE(chile_afp_comision_amount, 0) = 0
      AND COALESCE(chile_gratificacion_legal, 0) = 0
      AND COALESCE(chile_health_amount, 0) = 0
      AND COALESCE(chile_health_obligatoria_amount, 0) = 0
      AND COALESCE(chile_health_voluntaria_amount, 0) = 0
      AND COALESCE(chile_employer_sis_amount, 0) = 0
      AND COALESCE(chile_employer_cesantia_amount, 0) = 0
      AND COALESCE(chile_employer_mutual_amount, 0) = 0
      AND COALESCE(chile_employer_total_cost, 0) = 0
      AND COALESCE(chile_unemployment_rate, 0) = 0
      AND COALESCE(chile_unemployment_amount, 0) = 0
      AND COALESCE(chile_taxable_base, 0) = 0
      AND COALESCE(chile_tax_amount, 0) = 0
      AND COALESCE(chile_apv_amount, 0) = 0
      AND COALESCE(chile_total_deductions, 0) = 0
    )
  ) NOT VALID;

-- Down Migration

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_international_boundary_check;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_honorarios_boundary_check;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_contract_type_snapshot_check;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP COLUMN IF EXISTS contract_type_snapshot;
