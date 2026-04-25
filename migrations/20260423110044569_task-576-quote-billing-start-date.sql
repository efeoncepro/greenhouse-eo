-- Up Migration

-- Reconstructed from live pgmigrations state on 2026-04-23.
-- The database already had this migration applied, but the SQL file was not
-- versioned locally. Keep the operation conservative and idempotent so fresh
-- environments regain the same chain ordering without mutating existing prod
-- semantics unexpectedly.

ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS billing_start_date date;

UPDATE greenhouse_commercial.quotations
   SET billing_start_date = COALESCE(
     billing_start_date,
     issued_at::date,
     quote_date::date,
     CURRENT_DATE
   )
 WHERE billing_start_date IS NULL;

COMMENT ON COLUMN greenhouse_commercial.quotations.billing_start_date IS
  'Canonical billing-start date used for HubSpot quote publish-ready recurring line items. Reconstructed migration file after repo drift on 2026-04-23.';

-- Down Migration

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS billing_start_date;
