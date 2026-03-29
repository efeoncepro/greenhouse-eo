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
