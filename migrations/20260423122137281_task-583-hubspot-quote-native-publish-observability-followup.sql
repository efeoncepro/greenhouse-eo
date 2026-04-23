-- Up Migration

ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS hubspot_quote_status text,
  ADD COLUMN IF NOT EXISTS hubspot_quote_link text,
  ADD COLUMN IF NOT EXISTS hubspot_quote_pdf_download_link text,
  ADD COLUMN IF NOT EXISTS hubspot_quote_locked boolean;

CREATE INDEX IF NOT EXISTS idx_commercial_quotations_hubspot_quote_status
  ON greenhouse_commercial.quotations (hubspot_quote_status)
  WHERE hubspot_quote_status IS NOT NULL;

COMMENT ON COLUMN greenhouse_commercial.quotations.hubspot_quote_status IS
  'Observed native HubSpot quote status (`hs_status`) from the last successful outbound write/read.';

COMMENT ON COLUMN greenhouse_commercial.quotations.hubspot_quote_link IS
  'Observed native HubSpot public quote link (`hs_quote_link`) from the last successful outbound write/read.';

COMMENT ON COLUMN greenhouse_commercial.quotations.hubspot_quote_pdf_download_link IS
  'Observed native HubSpot PDF download link (`hs_pdf_download_link`) from the last successful outbound write/read.';

COMMENT ON COLUMN greenhouse_commercial.quotations.hubspot_quote_locked IS
  'Observed native HubSpot lock state (`hs_locked`) from the last successful outbound write/read.';

-- Down Migration

DROP INDEX IF EXISTS idx_commercial_quotations_hubspot_quote_status;

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS hubspot_quote_locked,
  DROP COLUMN IF EXISTS hubspot_quote_pdf_download_link,
  DROP COLUMN IF EXISTS hubspot_quote_link,
  DROP COLUMN IF EXISTS hubspot_quote_status;
