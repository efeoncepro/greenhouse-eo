-- Up Migration
-- TASK-545 Fase A: drift detection staging table. Populated by TASK-548 cron
-- and resolved from Admin Center UI. Fase A creates the table + indexes; no
-- writes happen yet.
--
-- Conflict types (§5.2):
--  - orphan_in_hubspot   → product exists in HubSpot, missing in Greenhouse.
--  - orphan_in_greenhouse → product exists in Greenhouse, missing in HubSpot.
--  - field_drift         → checksum mismatch on GH-owned fields.
--  - sku_collision       → two sources claim the same product_code.
--  - archive_mismatch    → archival flag diverges between GH and HS.

SET search_path = greenhouse_commercial, public;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.product_sync_conflicts (
  conflict_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text
    REFERENCES greenhouse_commercial.product_catalog(product_id) ON DELETE SET NULL,
  hubspot_product_id text,
  conflict_type text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT NOW(),
  conflicting_fields jsonb,
  resolution_status text NOT NULL DEFAULT 'pending',
  resolution_applied_at timestamptz,
  resolved_by text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT product_sync_conflicts_type_valid
    CHECK (conflict_type IN (
      'orphan_in_hubspot',
      'orphan_in_greenhouse',
      'field_drift',
      'sku_collision',
      'archive_mismatch'
    )),
  CONSTRAINT product_sync_conflicts_resolution_valid
    CHECK (resolution_status IN (
      'pending',
      'resolved_greenhouse_wins',
      'resolved_hubspot_wins',
      'ignored'
    )),
  CONSTRAINT product_sync_conflicts_resolution_consistent
    CHECK (
      (resolution_status = 'pending' AND resolution_applied_at IS NULL AND resolved_by IS NULL)
      OR (resolution_status <> 'pending' AND resolution_applied_at IS NOT NULL)
    ),
  CONSTRAINT product_sync_conflicts_anchor_present
    CHECK (product_id IS NOT NULL OR hubspot_product_id IS NOT NULL)
);

-- Hot path: Admin Center lists unresolved conflicts by recency.
CREATE INDEX IF NOT EXISTS idx_product_sync_conflicts_unresolved
  ON greenhouse_commercial.product_sync_conflicts (detected_at DESC)
  WHERE resolution_status = 'pending';

-- Lookup by anchor for drift cron dedup.
CREATE INDEX IF NOT EXISTS idx_product_sync_conflicts_product
  ON greenhouse_commercial.product_sync_conflicts (product_id, conflict_type)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_sync_conflicts_hubspot
  ON greenhouse_commercial.product_sync_conflicts (hubspot_product_id, conflict_type)
  WHERE hubspot_product_id IS NOT NULL;

COMMENT ON TABLE greenhouse_commercial.product_sync_conflicts IS
  'Drift detection staging for Greenhouse ↔ HubSpot product catalog sync. Populated by TASK-548 cron, resolved from Admin Center UI. Append-only from cron; resolution fields are the only legal UPDATE target.';

-- Runtime grants — runtime needs SELECT/INSERT/UPDATE (resolve), never DELETE.
GRANT SELECT, INSERT, UPDATE
  ON greenhouse_commercial.product_sync_conflicts
  TO greenhouse_runtime;

-- Down Migration

SET search_path = greenhouse_commercial, public;

DROP INDEX IF EXISTS greenhouse_commercial.idx_product_sync_conflicts_hubspot;
DROP INDEX IF EXISTS greenhouse_commercial.idx_product_sync_conflicts_product;
DROP INDEX IF EXISTS greenhouse_commercial.idx_product_sync_conflicts_unresolved;

DROP TABLE IF EXISTS greenhouse_commercial.product_sync_conflicts;
