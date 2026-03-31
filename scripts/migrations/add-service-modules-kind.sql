-- ────────────────────────────────────────────────────────────────────────
-- Migration: add module_kind + parent_module_code to service_modules
-- Task: TASK-016 (Business Units Canonical v2)
-- Purpose: Bring PG service_modules to parity with BigQuery schema.
--          module_kind distinguishes 'business_line' from 'service_module'.
--          parent_module_code links service modules to their parent BL.
-- ────────────────────────────────────────────────────────────────────────

-- 1. Add columns
ALTER TABLE greenhouse_core.service_modules
  ADD COLUMN IF NOT EXISTS module_kind TEXT,
  ADD COLUMN IF NOT EXISTS parent_module_code TEXT;

-- 2. Backfill from existing data
--    business_line entries: module_code = business_line → module_kind = 'business_line'
--    service modules: module_code != business_line → module_kind = 'service_module', parent = business_line
UPDATE greenhouse_core.service_modules
SET
  module_kind = CASE
    WHEN business_line IS NOT NULL AND business_line = module_code THEN 'business_line'
    WHEN business_line IS NOT NULL AND business_line != module_code THEN 'service_module'
    ELSE 'service_module'
  END,
  parent_module_code = CASE
    WHEN business_line IS NOT NULL AND business_line != module_code THEN business_line
    ELSE NULL
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE module_kind IS NULL;

-- 3. Index for kind-based lookups
CREATE INDEX IF NOT EXISTS idx_service_modules_kind
  ON greenhouse_core.service_modules (module_kind);

-- 4. RBAC — columns inherit table grants, no new grants needed

-- 5. Migration log
INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'add-service-modules-kind-v1',
  'service_modules',
  CURRENT_USER,
  'TASK-016: Add module_kind and parent_module_code to service_modules for BQ parity.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  migration_group = EXCLUDED.migration_group,
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;
