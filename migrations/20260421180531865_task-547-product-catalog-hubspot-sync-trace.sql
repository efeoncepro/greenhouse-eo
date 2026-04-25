-- Up Migration
-- TASK-547: Product Catalog HubSpot Outbound — persist trace columns on
-- `greenhouse_commercial.product_catalog` so every outbound push leaves
-- auditable evidence (status, last error, attempt count, anti-ping-pong
-- guard timestamp). Mirrors the TASK-524 pattern for `greenhouse_finance.income`.
--
-- Column additions are nullable (or safe-default) — the outbound bridge
-- populates them only when the reactive projection pushes to HubSpot. No
-- backfill required for existing rows; they surface as `hubspot_sync_status IS NULL`
-- (== never attempted) until the next lifecycle event triggers a push.

SET search_path = greenhouse_commercial, public;

ALTER TABLE greenhouse_commercial.product_catalog
  ADD COLUMN IF NOT EXISTS hubspot_sync_status text,
  ADD COLUMN IF NOT EXISTS hubspot_sync_error text,
  ADD COLUMN IF NOT EXISTS hubspot_sync_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hubspot_last_write_at timestamptz;

-- Sync status domain — matches ProductHubSpotSyncStatus union in
-- src/lib/hubspot/product-hubspot-types.ts. Drift between TS and SQL breaks
-- the build intentionally.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_catalog_hubspot_sync_status_valid'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_hubspot_sync_status_valid
      CHECK (hubspot_sync_status IS NULL OR hubspot_sync_status IN (
        'pending',
        'synced',
        'failed',
        'endpoint_not_deployed',
        'skipped_no_anchors'
      ));
  END IF;
END $$;

-- Idempotent backfill: legacy rows created before TASK-547 may have
-- `hubspot_product_id` populated via the pre-TASK-546 `create-hubspot-product.ts`
-- helper without writing `last_outbound_sync_at` (the column did not exist
-- then). Copy forward from the legacy `last_synced_at` timestamp so the
-- consistency constraint below can be enforced for new writes without
-- breaking existing state.
UPDATE greenhouse_commercial.product_catalog
   SET last_outbound_sync_at = last_synced_at
 WHERE hubspot_product_id IS NOT NULL
   AND last_outbound_sync_at IS NULL
   AND last_synced_at IS NOT NULL;

-- For rows where neither timestamp was ever recorded, stamp `created_at`
-- as a best-effort synced-at so the invariant holds. These rows will emit
-- a real sync event as soon as the next lifecycle event fires through
-- the reactive projection.
UPDATE greenhouse_commercial.product_catalog
   SET last_outbound_sync_at = created_at
 WHERE hubspot_product_id IS NOT NULL
   AND last_outbound_sync_at IS NULL;

-- Consistency: if the HubSpot id is set, we must also carry an outbound
-- synced timestamp (defensive against half-written rows from worker crashes).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_catalog_hubspot_trace_consistent'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_hubspot_trace_consistent
      CHECK (
        hubspot_product_id IS NULL
        OR last_outbound_sync_at IS NOT NULL
      );
  END IF;
END $$;

-- Hot path: the retry worker picks pending + failed + endpoint_not_deployed
-- rows older than N seconds. Partial index keeps the scan cheap (most rows
-- end up `synced`).
CREATE INDEX IF NOT EXISTS idx_product_catalog_hubspot_sync_retryable
  ON greenhouse_commercial.product_catalog (hubspot_sync_status, last_outbound_sync_at NULLS FIRST)
  WHERE hubspot_sync_status IN ('pending', 'failed', 'endpoint_not_deployed');

-- Anti-ping-pong: the outbound guard reads `hubspot_last_write_at` to skip
-- pushes that would immediately echo back from HubSpot webhooks. Partial
-- index keeps the guard lookup O(log n).
CREATE INDEX IF NOT EXISTS idx_product_catalog_hubspot_last_write
  ON greenhouse_commercial.product_catalog (hubspot_last_write_at DESC NULLS LAST)
  WHERE hubspot_last_write_at IS NOT NULL;

COMMENT ON COLUMN greenhouse_commercial.product_catalog.hubspot_sync_status IS
  'TASK-547: last outbound attempt status (pending | synced | failed | endpoint_not_deployed | skipped_no_anchors). NULL == never attempted.';

COMMENT ON COLUMN greenhouse_commercial.product_catalog.hubspot_sync_error IS
  'TASK-547: short error message from the last failed outbound attempt. Cleared on the next successful sync.';

COMMENT ON COLUMN greenhouse_commercial.product_catalog.hubspot_sync_attempt_count IS
  'TASK-547: monotonic counter of outbound attempts since last success. Reset to 0 on synced.';

COMMENT ON COLUMN greenhouse_commercial.product_catalog.hubspot_last_write_at IS
  'TASK-547: timestamp of the last successful outbound write to HubSpot. Inbound sync (TASK-548) consults this to skip pushes received within 60s (anti-ping-pong guard).';


-- Down Migration

ALTER TABLE greenhouse_commercial.product_catalog
  DROP CONSTRAINT IF EXISTS product_catalog_hubspot_sync_status_valid,
  DROP CONSTRAINT IF EXISTS product_catalog_hubspot_trace_consistent;

DROP INDEX IF EXISTS greenhouse_commercial.idx_product_catalog_hubspot_sync_retryable;

DROP INDEX IF EXISTS greenhouse_commercial.idx_product_catalog_hubspot_last_write;

ALTER TABLE greenhouse_commercial.product_catalog
  DROP COLUMN IF EXISTS hubspot_sync_status,
  DROP COLUMN IF EXISTS hubspot_sync_error,
  DROP COLUMN IF EXISTS hubspot_sync_attempt_count,
  DROP COLUMN IF EXISTS hubspot_last_write_at;
