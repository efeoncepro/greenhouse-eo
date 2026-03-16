-- ════════════════════════════════════════════════════════════════════════════
-- Account 360 — M3.3: Finance Bridge
-- ════════════════════════════════════════════════════════════════════════════
-- Adds organization_id FK to greenhouse_finance.client_profiles
-- Enables queries by Organization across the financial layer.
-- Safe to run multiple times (idempotent).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE greenhouse_finance.client_profiles
  ADD COLUMN IF NOT EXISTS organization_id TEXT
  REFERENCES greenhouse_core.organizations(organization_id);

CREATE INDEX IF NOT EXISTS finance_client_profiles_org_idx
  ON greenhouse_finance.client_profiles (organization_id);

-- Backfill: link each client_profile to its organization via spaces.client_id
UPDATE greenhouse_finance.client_profiles cp
SET organization_id = (
  SELECT s.organization_id
  FROM greenhouse_core.spaces s
  WHERE s.client_id = cp.client_id
    AND s.active = TRUE
  LIMIT 1
)
WHERE cp.organization_id IS NULL
  AND cp.client_id IS NOT NULL;

-- Migration record
INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'finance-bridge-m33-v1',
  'account_360',
  CURRENT_USER,
  'Adds organization_id FK to client_profiles for cross-entity finance queries.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;
