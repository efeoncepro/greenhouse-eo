-- Up Migration

ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS billing_start_date date;

-- Down Migration

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS billing_start_date;
