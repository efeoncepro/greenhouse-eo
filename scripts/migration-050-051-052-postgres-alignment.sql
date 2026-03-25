-- ══════════════════════════════════════════════════════
-- Migration: TASK-050/051/052 Postgres Alignment
-- Ensures all tables and columns exist for Postgres-first
-- finance client resolution and payroll bridge.
-- Safe to run multiple times (idempotent).
-- ══════════════════════════════════════════════════════

-- 1. Ensure greenhouse_finance.client_profiles has organization_id
-- (may already exist from M3.3 bridge)
ALTER TABLE greenhouse_finance.client_profiles
  ADD COLUMN IF NOT EXISTS organization_id TEXT
  REFERENCES greenhouse_core.organizations(organization_id);

CREATE INDEX IF NOT EXISTS finance_client_profiles_org_idx
  ON greenhouse_finance.client_profiles (organization_id);

-- 2. Backfill organization_id where missing
UPDATE greenhouse_finance.client_profiles cp
SET organization_id = (
  SELECT s.organization_id
  FROM greenhouse_core.spaces s
  WHERE s.client_id = cp.client_id AND s.active = TRUE
  LIMIT 1
)
WHERE cp.organization_id IS NULL
  AND cp.client_id IS NOT NULL;

-- 3. Ensure greenhouse_payroll schema exists and has correct tables
-- (these should already exist from payroll setup, but verify)
CREATE SCHEMA IF NOT EXISTS greenhouse_payroll;

-- 4. Verify payroll_periods has the columns the trends query expects
-- period_year and period_month are the key columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_payroll'
      AND table_name = 'payroll_periods'
      AND column_name = 'period_year'
  ) THEN
    RAISE WARNING 'greenhouse_payroll.payroll_periods.period_year column missing — payroll schema may not be provisioned';
  END IF;
END $$;

-- 5. Ensure indexes for the new query patterns
CREATE INDEX IF NOT EXISTS idx_clients_hubspot_company_id
  ON greenhouse_core.clients (hubspot_company_id)
  WHERE hubspot_company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_profiles_client_id
  ON greenhouse_finance.client_profiles (client_id);

CREATE INDEX IF NOT EXISTS idx_client_profiles_hubspot_id
  ON greenhouse_finance.client_profiles (hubspot_company_id)
  WHERE hubspot_company_id IS NOT NULL;

-- 6. Document migration (skip if migration_log doesn't exist)
DO $$
BEGIN
  INSERT INTO greenhouse_sync.migration_log (migration_id, domain, applied_by, description)
  VALUES (
    'task-050-051-052-postgres-alignment',
    'finance',
    CURRENT_USER,
    'Ensures Postgres-first tables and indexes for finance client resolution, payroll bridge, and person access alignment.'
  )
  ON CONFLICT (migration_id) DO UPDATE
  SET applied_at = CURRENT_TIMESTAMP;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'migration_log table does not exist, skipping migration tracking';
END $$;
