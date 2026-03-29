-- Add desired_net_clp to compensation_versions
-- Stores the contractual "líquido deseado" when compensation was set via reverse calculation.
-- NULL means the compensation was set by entering base salary directly.

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD COLUMN IF NOT EXISTS desired_net_clp NUMERIC(14,2);
