-- Up Migration

ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS sales_context_at_sent jsonb;

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_sales_context_at_sent_object_chk;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_sales_context_at_sent_object_chk
  CHECK (
    sales_context_at_sent IS NULL
    OR jsonb_typeof(sales_context_at_sent) = 'object'
  );

CREATE INDEX IF NOT EXISTS idx_quotations_sales_context_category
  ON greenhouse_commercial.quotations (
    space_id,
    (sales_context_at_sent ->> 'category_at_sent'),
    sent_at DESC
  )
  WHERE sales_context_at_sent IS NOT NULL;

COMMENT ON COLUMN greenhouse_commercial.quotations.sales_context_at_sent IS
  'Immutable snapshot of lifecycle/deal context captured when the quotation first reaches sent status.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial.idx_quotations_sales_context_category;

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_sales_context_at_sent_object_chk;

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS sales_context_at_sent;
