-- Up Migration

-- Add multi-source columns to greenhouse_finance.quotes
ALTER TABLE greenhouse_finance.quotes
  ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS hubspot_quote_id TEXT,
  ADD COLUMN IF NOT EXISTS hubspot_deal_id TEXT,
  ADD COLUMN IF NOT EXISTS hubspot_last_synced_at TIMESTAMPTZ;

-- Indexes for HubSpot lookups and source filtering
CREATE INDEX IF NOT EXISTS idx_quotes_hubspot ON greenhouse_finance.quotes (hubspot_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_source ON greenhouse_finance.quotes (source_system);

-- Backfill: existing quotes with nubox_document_id are from Nubox
UPDATE greenhouse_finance.quotes
SET source_system = 'nubox'
WHERE nubox_document_id IS NOT NULL
  AND (source_system IS NULL OR source_system = 'manual');

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_quotes_source;
DROP INDEX IF EXISTS greenhouse_finance.idx_quotes_hubspot;

ALTER TABLE greenhouse_finance.quotes
  DROP COLUMN IF EXISTS hubspot_last_synced_at,
  DROP COLUMN IF EXISTS hubspot_deal_id,
  DROP COLUMN IF EXISTS hubspot_quote_id,
  DROP COLUMN IF EXISTS source_system;
