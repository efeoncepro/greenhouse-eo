ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS legal_address TEXT;

ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS is_operating_entity BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE greenhouse_core.organizations
SET
  legal_address = 'Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile',
  is_operating_entity = TRUE,
  updated_at = CURRENT_TIMESTAMP
WHERE tax_id = '77.357.182-1'
  AND legal_name = 'Efeonce Group SpA';
