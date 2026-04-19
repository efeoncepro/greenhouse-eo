-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_serving, greenhouse_core, public;

ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS commercial_model text,
  ADD COLUMN IF NOT EXISTS staffing_model text;

UPDATE greenhouse_commercial.quotations
SET commercial_model = CASE pricing_model
      WHEN 'retainer' THEN 'retainer'
      WHEN 'staff_aug' THEN 'retainer'
      WHEN 'project' THEN 'project'
      ELSE 'one_off'
    END,
    staffing_model = CASE pricing_model
      WHEN 'retainer' THEN 'outcome_based'
      WHEN 'staff_aug' THEN 'named_resources'
      WHEN 'project' THEN 'outcome_based'
      ELSE 'hybrid'
    END
WHERE commercial_model IS NULL
   OR staffing_model IS NULL;

ALTER TABLE greenhouse_commercial.quotations
  ALTER COLUMN commercial_model SET DEFAULT 'project',
  ALTER COLUMN staffing_model SET DEFAULT 'outcome_based',
  ALTER COLUMN commercial_model SET NOT NULL,
  ALTER COLUMN staffing_model SET NOT NULL;

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_commercial_model_valid,
  DROP CONSTRAINT IF EXISTS quotations_staffing_model_valid;

ALTER TABLE greenhouse_commercial.quotations
  ADD CONSTRAINT quotations_commercial_model_valid
    CHECK (commercial_model IN ('retainer', 'project', 'one_off')),
  ADD CONSTRAINT quotations_staffing_model_valid
    CHECK (staffing_model IN ('named_resources', 'outcome_based', 'hybrid'));

CREATE INDEX IF NOT EXISTS idx_quotations_delivery_models
  ON greenhouse_commercial.quotations (space_id, commercial_model, staffing_model);

UPDATE greenhouse_commercial.quotations
SET sales_context_at_sent = COALESCE(sales_context_at_sent, '{}'::jsonb)
  || jsonb_build_object(
    'pricing_model', pricing_model,
    'commercial_model', commercial_model,
    'staffing_model', staffing_model
  )
WHERE sales_context_at_sent IS NOT NULL;

ALTER TABLE greenhouse_serving.quotation_pipeline_snapshots
  ADD COLUMN IF NOT EXISTS commercial_model text,
  ADD COLUMN IF NOT EXISTS staffing_model text;

UPDATE greenhouse_serving.quotation_pipeline_snapshots AS s
SET commercial_model = q.commercial_model,
    staffing_model = q.staffing_model
FROM greenhouse_commercial.quotations AS q
WHERE q.quotation_id = s.quotation_id
  AND (s.commercial_model IS NULL OR s.staffing_model IS NULL);

CREATE INDEX IF NOT EXISTS idx_quotation_pipeline_snapshots_delivery_models
  ON greenhouse_serving.quotation_pipeline_snapshots (space_id, commercial_model, staffing_model);

ALTER TABLE greenhouse_serving.quotation_profitability_snapshots
  ADD COLUMN IF NOT EXISTS pricing_model text,
  ADD COLUMN IF NOT EXISTS commercial_model text,
  ADD COLUMN IF NOT EXISTS staffing_model text;

UPDATE greenhouse_serving.quotation_profitability_snapshots AS s
SET pricing_model = q.pricing_model,
    commercial_model = q.commercial_model,
    staffing_model = q.staffing_model
FROM greenhouse_commercial.quotations AS q
WHERE q.quotation_id = s.quotation_id
  AND (
    s.pricing_model IS NULL
    OR s.commercial_model IS NULL
    OR s.staffing_model IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_quotation_profitability_snapshots_delivery_models
  ON greenhouse_serving.quotation_profitability_snapshots (
    space_id,
    commercial_model,
    staffing_model
  );

ALTER TABLE greenhouse_serving.deal_pipeline_snapshots
  ADD COLUMN IF NOT EXISTS latest_quote_pricing_model text,
  ADD COLUMN IF NOT EXISTS latest_quote_commercial_model text,
  ADD COLUMN IF NOT EXISTS latest_quote_staffing_model text;

CREATE INDEX IF NOT EXISTS idx_deal_pipeline_snapshots_latest_quote_delivery_models
  ON greenhouse_serving.deal_pipeline_snapshots (
    space_id,
    latest_quote_commercial_model,
    latest_quote_staffing_model
  );

-- Down Migration

DROP INDEX IF EXISTS idx_deal_pipeline_snapshots_latest_quote_delivery_models;
ALTER TABLE greenhouse_serving.deal_pipeline_snapshots
  DROP COLUMN IF EXISTS latest_quote_staffing_model,
  DROP COLUMN IF EXISTS latest_quote_commercial_model,
  DROP COLUMN IF EXISTS latest_quote_pricing_model;

DROP INDEX IF EXISTS idx_quotation_profitability_snapshots_delivery_models;
ALTER TABLE greenhouse_serving.quotation_profitability_snapshots
  DROP COLUMN IF EXISTS staffing_model,
  DROP COLUMN IF EXISTS commercial_model,
  DROP COLUMN IF EXISTS pricing_model;

DROP INDEX IF EXISTS idx_quotation_pipeline_snapshots_delivery_models;
ALTER TABLE greenhouse_serving.quotation_pipeline_snapshots
  DROP COLUMN IF EXISTS staffing_model,
  DROP COLUMN IF EXISTS commercial_model;

DROP INDEX IF EXISTS idx_quotations_delivery_models;
ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_staffing_model_valid,
  DROP CONSTRAINT IF EXISTS quotations_commercial_model_valid,
  ALTER COLUMN staffing_model DROP DEFAULT,
  ALTER COLUMN commercial_model DROP DEFAULT,
  DROP COLUMN IF EXISTS staffing_model,
  DROP COLUMN IF EXISTS commercial_model;
