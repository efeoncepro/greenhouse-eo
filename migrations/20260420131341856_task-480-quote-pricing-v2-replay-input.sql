-- Up Migration

ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS pricing_context jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_pricing_context_shape_check;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_pricing_context_shape_check
  CHECK (jsonb_typeof(pricing_context) = 'object');

COMMENT ON COLUMN greenhouse_commercial.quotations.pricing_context IS
  'Replay context for pricing-engine-v2 (commercial model code, country factor and related controls).';

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD COLUMN IF NOT EXISTS pricing_input jsonb;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_pricing_input_shape_check;

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD CONSTRAINT quotation_line_items_pricing_input_shape_check
  CHECK (
    pricing_input IS NULL
    OR jsonb_typeof(pricing_input) = 'object'
  );

COMMENT ON COLUMN greenhouse_commercial.quotation_line_items.pricing_input IS
  'Persisted pricing-engine-v2 line input for faithful repricing/replay outside the interactive builder.';

-- Down Migration

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_pricing_input_shape_check;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP COLUMN IF EXISTS pricing_input;

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_pricing_context_shape_check;

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS pricing_context;
