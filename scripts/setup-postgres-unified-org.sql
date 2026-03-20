-- ════════════════════════════════════════════════════════════════════════════
-- Unified Organization Model — Schema Migrations
-- ════════════════════════════════════════════════════════════════════════════
-- Adds organization_type to organizations, and organization_id FK to
-- income and suppliers tables. All changes are additive (nullable columns,
-- new indexes) — no existing data or constraints are modified.
-- ════════════════════════════════════════════════════════════════════════════

-- 1a. Add organization_type to organizations
--     Values: 'client', 'supplier', 'both', 'other'
ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'other';

-- Add CHECK constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_type_check'
      AND conrelid = 'greenhouse_core.organizations'::regclass
  ) THEN
    ALTER TABLE greenhouse_core.organizations
      ADD CONSTRAINT organizations_type_check
      CHECK (organization_type IN ('client', 'supplier', 'both', 'other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS organizations_type_idx
  ON greenhouse_core.organizations (organization_type) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS organizations_tax_id_idx
  ON greenhouse_core.organizations (tax_id) WHERE tax_id IS NOT NULL AND tax_id <> '';

-- 1b. Add organization_id FK to income
ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS organization_id TEXT
    REFERENCES greenhouse_core.organizations(organization_id);

CREATE INDEX IF NOT EXISTS finance_income_organization_idx
  ON greenhouse_finance.income (organization_id);

-- 1c. Add organization_id FK to suppliers
ALTER TABLE greenhouse_finance.suppliers
  ADD COLUMN IF NOT EXISTS organization_id TEXT
    REFERENCES greenhouse_core.organizations(organization_id);

CREATE INDEX IF NOT EXISTS finance_suppliers_organization_idx
  ON greenhouse_finance.suppliers (organization_id);
