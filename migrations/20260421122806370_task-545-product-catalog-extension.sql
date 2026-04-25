-- Up Migration
-- TASK-545 Fase A: extend `greenhouse_commercial.product_catalog` with the
-- columns needed to materialize from the 4 source catalogs (sellable_roles,
-- tool_catalog, overhead_addons, service_pricing) and to support archival
-- semantics + drift detection.
--
-- Scope: DDL only. Handlers are scaffolded in TS but remain inactive until
-- TASK-546 (Fase B). Outbound to HubSpot lands in TASK-547 (Fase C).

SET search_path = greenhouse_commercial, public;

-- ── Linking columns ────────────────────────────────────────────────────────
-- `source_kind` classifies which source catalog owns the row. NULL is allowed
-- transiently for legacy rows until the backfill runs; M3 makes every row
-- non-null before this migration set is considered complete.
-- `source_id` references the PK of the owning source table (role_id,
-- tool_id, addon_id, module_id). NULL for `manual` + `hubspot_imported`.
-- `source_variant_key` is reserved for Fase B variants on top of sellable_roles
-- (e.g. same role with different seniority tier) — always NULL in Fase A.
ALTER TABLE greenhouse_commercial.product_catalog
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS source_variant_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_catalog_source_kind_valid'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_source_kind_valid
      CHECK (source_kind IS NULL OR source_kind IN (
        'sellable_role',
        'sellable_role_variant',
        'tool',
        'overhead_addon',
        'service',
        'manual',
        'hubspot_imported'
      ));
  END IF;
END $$;

-- ── Archival semantics ─────────────────────────────────────────────────────
ALTER TABLE greenhouse_commercial.product_catalog
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by text;

-- ── Sync / drift metadata ──────────────────────────────────────────────────
-- `last_outbound_sync_at` — updated by TASK-547 outbound when HubSpot ACKs.
-- `last_drift_check_at` — updated by TASK-548 drift cron.
-- `gh_owned_fields_checksum` — SHA-256 of Greenhouse-owned fields, recomputed
-- by the commit handler (TASK-546+). Remains NULL until the first materialize
-- run under Fase B.
ALTER TABLE greenhouse_commercial.product_catalog
  ADD COLUMN IF NOT EXISTS last_outbound_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_drift_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS gh_owned_fields_checksum text;

-- ── Constraints ────────────────────────────────────────────────────────────
-- UNIQUE(source_kind, source_id, source_variant_key) only for rows whose
-- source is actually a deterministic entity we can link to. `manual` rows
-- keep `source_id=NULL` by design; `hubspot_imported` orphans have no
-- Greenhouse-side source.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_catalog_source_ident
  ON greenhouse_commercial.product_catalog (source_kind, source_id, COALESCE(source_variant_key, ''))
  WHERE source_kind IS NOT NULL
    AND source_kind NOT IN ('manual', 'hubspot_imported');

-- Hot-path indexes: filter by source (materializer refresh) and hide archived
-- rows from the Quote Builder product selector.
CREATE INDEX IF NOT EXISTS idx_product_catalog_source
  ON greenhouse_commercial.product_catalog (source_kind, source_id)
  WHERE source_kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_catalog_active_non_archived
  ON greenhouse_commercial.product_catalog (active, is_archived)
  WHERE is_archived = FALSE;

-- Useful in drift cron: find products never outbound-synced or stale.
CREATE INDEX IF NOT EXISTS idx_product_catalog_last_outbound_sync
  ON greenhouse_commercial.product_catalog (last_outbound_sync_at NULLS FIRST)
  WHERE is_archived = FALSE;

-- ── Column comments ────────────────────────────────────────────────────────
COMMENT ON COLUMN greenhouse_commercial.product_catalog.source_kind IS
  'Which source catalog owns this row. One of sellable_role, sellable_role_variant, tool, overhead_addon, service, manual, hubspot_imported. See GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1 §5.';

COMMENT ON COLUMN greenhouse_commercial.product_catalog.source_id IS
  'PK of the source row in the owning catalog (role_id / tool_id / addon_id / module_id). NULL for source_kind in (manual, hubspot_imported).';

COMMENT ON COLUMN greenhouse_commercial.product_catalog.source_variant_key IS
  'Reserved for sellable_role_variant — deterministic key differentiating variants of the same role. Always NULL in Fase A.';

COMMENT ON COLUMN greenhouse_commercial.product_catalog.is_archived IS
  'Soft-archive flag. Archived products are hidden from selectors but preserved for historical quotations/contracts.';

COMMENT ON COLUMN greenhouse_commercial.product_catalog.last_outbound_sync_at IS
  'Timestamp of the most recent successful HubSpot outbound push (TASK-547). NULL until first sync.';

COMMENT ON COLUMN greenhouse_commercial.product_catalog.last_drift_check_at IS
  'Timestamp of the most recent drift detection pass (TASK-548). NULL until first cron run.';

COMMENT ON COLUMN greenhouse_commercial.product_catalog.gh_owned_fields_checksum IS
  'SHA-256 of the Greenhouse-owned fields joined with | — used by drift detection to compare against HubSpot snapshot. Recomputed on every commit. NULL until first materialize.';

-- Down Migration

SET search_path = greenhouse_commercial, public;

DROP INDEX IF EXISTS greenhouse_commercial.idx_product_catalog_last_outbound_sync;
DROP INDEX IF EXISTS greenhouse_commercial.idx_product_catalog_active_non_archived;
DROP INDEX IF EXISTS greenhouse_commercial.idx_product_catalog_source;
DROP INDEX IF EXISTS greenhouse_commercial.uq_product_catalog_source_ident;

ALTER TABLE greenhouse_commercial.product_catalog
  DROP CONSTRAINT IF EXISTS product_catalog_source_kind_valid;

ALTER TABLE greenhouse_commercial.product_catalog
  DROP COLUMN IF EXISTS gh_owned_fields_checksum,
  DROP COLUMN IF EXISTS last_drift_check_at,
  DROP COLUMN IF EXISTS last_outbound_sync_at,
  DROP COLUMN IF EXISTS archived_by,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS is_archived,
  DROP COLUMN IF EXISTS source_variant_key,
  DROP COLUMN IF EXISTS source_id,
  DROP COLUMN IF EXISTS source_kind;
