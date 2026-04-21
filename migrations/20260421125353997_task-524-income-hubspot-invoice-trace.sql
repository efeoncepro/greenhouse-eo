-- Up Migration
-- TASK-524: Income → HubSpot Invoice Bridge — persist trace columns on
-- `greenhouse_finance.income` so every outbound attempt leaves auditable
-- evidence (remote invoice id, last sync timestamp, status, last error) and
-- a separate rail for the post-Nubox artifact (PDF/XML/DTE note).
--
-- Canonical destination per spec §Detailed Spec is the HubSpot native
-- `invoice` object (non-billable mirror, `hs_invoice_billable=false`).
-- Column additions are nullable and default-safe — the bridge populates them
-- only when the reactive projection pushes to HubSpot. No backfill required
-- for existing rows; they surface as `hubspot_sync_status='never_synced'`
-- implicitly (NULL) until the next edit triggers a publish.

SET search_path = greenhouse_finance, public;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS hubspot_invoice_id text,
  ADD COLUMN IF NOT EXISTS hubspot_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS hubspot_sync_status text,
  ADD COLUMN IF NOT EXISTS hubspot_sync_error text,
  ADD COLUMN IF NOT EXISTS hubspot_sync_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hubspot_artifact_note_id text,
  ADD COLUMN IF NOT EXISTS hubspot_artifact_synced_at timestamptz;

-- Sync status domain — matches IncomeHubSpotSyncStatus union in
-- src/lib/finance/income-hubspot/types.ts. Drift between TS and SQL breaks
-- the build intentionally.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'income_hubspot_sync_status_valid'
  ) THEN
    ALTER TABLE greenhouse_finance.income
      ADD CONSTRAINT income_hubspot_sync_status_valid
      CHECK (hubspot_sync_status IS NULL OR hubspot_sync_status IN (
        'pending',
        'synced',
        'failed',
        'endpoint_not_deployed',
        'skipped_no_anchors'
      ));
  END IF;
END $$;

-- When the invoice has a HubSpot id it must also carry a synced timestamp
-- (defensive — prevents half-written rows from partial worker crashes).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'income_hubspot_invoice_trace_consistent'
  ) THEN
    ALTER TABLE greenhouse_finance.income
      ADD CONSTRAINT income_hubspot_invoice_trace_consistent
      CHECK (
        hubspot_invoice_id IS NULL
        OR hubspot_last_synced_at IS NOT NULL
      );
  END IF;
END $$;

-- Hot path: the retry worker picks pending + failed rows older than N seconds.
-- Partial index keeps the scan cheap (most rows end up `synced`).
CREATE INDEX IF NOT EXISTS idx_income_hubspot_sync_retryable
  ON greenhouse_finance.income (hubspot_sync_status, hubspot_last_synced_at NULLS FIRST)
  WHERE hubspot_sync_status IN ('pending', 'failed', 'endpoint_not_deployed');

-- Reverse lookup: when HubSpot webhooks arrive with an invoice id we need to
-- resolve back to the Greenhouse income row in O(1).
CREATE UNIQUE INDEX IF NOT EXISTS idx_income_hubspot_invoice_id
  ON greenhouse_finance.income (hubspot_invoice_id)
  WHERE hubspot_invoice_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.income.hubspot_invoice_id IS
  'Id of the mirror invoice object in HubSpot (non-billable). Populated by the reactive outbound bridge in src/lib/finance/income-hubspot/.';

COMMENT ON COLUMN greenhouse_finance.income.hubspot_sync_status IS
  'Last outbound attempt status: pending | synced | failed | endpoint_not_deployed | skipped_no_anchors. NULL == never attempted.';

COMMENT ON COLUMN greenhouse_finance.income.hubspot_sync_error IS
  'Short error message from the last failed outbound attempt. Cleared on the next successful sync.';

COMMENT ON COLUMN greenhouse_finance.income.hubspot_sync_attempt_count IS
  'Monotonic counter of outbound attempts (success or failure). Used by retry worker to apply backoff.';

COMMENT ON COLUMN greenhouse_finance.income.hubspot_artifact_note_id IS
  'Id of the HubSpot engagement/note that attached the Nubox-emitted PDF/XML/DTE to the invoice + deal + company. Populated in the second sync phase (on finance.income.nubox_synced).';

COMMENT ON COLUMN greenhouse_finance.income.hubspot_artifact_synced_at IS
  'Timestamp of the artifact attach run. NULL until the Nubox document is linked into HubSpot.';

-- Down Migration

SET search_path = greenhouse_finance, public;

DROP INDEX IF EXISTS greenhouse_finance.idx_income_hubspot_invoice_id;
DROP INDEX IF EXISTS greenhouse_finance.idx_income_hubspot_sync_retryable;

ALTER TABLE greenhouse_finance.income
  DROP CONSTRAINT IF EXISTS income_hubspot_invoice_trace_consistent,
  DROP CONSTRAINT IF EXISTS income_hubspot_sync_status_valid;

ALTER TABLE greenhouse_finance.income
  DROP COLUMN IF EXISTS hubspot_artifact_synced_at,
  DROP COLUMN IF EXISTS hubspot_artifact_note_id,
  DROP COLUMN IF EXISTS hubspot_sync_attempt_count,
  DROP COLUMN IF EXISTS hubspot_sync_error,
  DROP COLUMN IF EXISTS hubspot_sync_status,
  DROP COLUMN IF EXISTS hubspot_last_synced_at,
  DROP COLUMN IF EXISTS hubspot_invoice_id;
