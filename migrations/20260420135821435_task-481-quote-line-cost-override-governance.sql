-- Up Migration

-- Override governance columns on quotation_line_items.
-- Captures the governed manual override alongside the suggested cost at the time of override,
-- for audit integrity even if the source catalog (rate cards, snapshots) changes later.

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD COLUMN IF NOT EXISTS cost_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS cost_override_category TEXT,
  ADD COLUMN IF NOT EXISTS cost_override_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS cost_override_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cost_override_delta_pct NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS cost_override_suggested_unit_cost_usd NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS cost_override_suggested_breakdown JSONB;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_cost_override_category_check;

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD CONSTRAINT quotation_line_items_cost_override_category_check
  CHECK (
    cost_override_category IS NULL
    OR cost_override_category IN (
      'competitive_pressure',
      'strategic_investment',
      'roi_correction',
      'error_correction',
      'client_negotiation',
      'other'
    )
  );

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_cost_override_suggested_breakdown_check;

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD CONSTRAINT quotation_line_items_cost_override_suggested_breakdown_check
  CHECK (
    cost_override_suggested_breakdown IS NULL
    OR jsonb_typeof(cost_override_suggested_breakdown) = 'object'
  );

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_cost_override_coherence_check;

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD CONSTRAINT quotation_line_items_cost_override_coherence_check
  CHECK (
    (cost_override_reason IS NULL AND cost_override_category IS NULL AND cost_override_at IS NULL)
    OR (cost_override_reason IS NOT NULL AND cost_override_category IS NOT NULL AND cost_override_at IS NOT NULL)
  );

COMMENT ON COLUMN greenhouse_commercial.quotation_line_items.cost_override_reason IS
  'Required free-text justification for a manual cost override on this line. 15-500 chars (shorter if category is not other).';

COMMENT ON COLUMN greenhouse_commercial.quotation_line_items.cost_override_category IS
  'Structured category for the override (competitive_pressure | strategic_investment | roi_correction | error_correction | client_negotiation | other) to enable analytics on override patterns.';

COMMENT ON COLUMN greenhouse_commercial.quotation_line_items.cost_override_by_user_id IS
  'User profile id of the actor who performed the override. Soft FK to greenhouse_core.identity_profiles.';

COMMENT ON COLUMN greenhouse_commercial.quotation_line_items.cost_override_at IS
  'Timestamp of the override action. Null when the line has never been overridden.';

COMMENT ON COLUMN greenhouse_commercial.quotation_line_items.cost_override_delta_pct IS
  'Signed delta percentage between override_unit_cost and suggested_unit_cost at the moment of override. Positive = override above suggested.';

COMMENT ON COLUMN greenhouse_commercial.quotation_line_items.cost_override_suggested_unit_cost_usd IS
  'Snapshot of the system-suggested unit cost (USD) at the moment of override. Immutable for audit integrity even if the source catalog changes.';

COMMENT ON COLUMN greenhouse_commercial.quotation_line_items.cost_override_suggested_breakdown IS
  'Full snapshot of the suggested cost_breakdown JSONB (provenance, confidence, freshness) at the moment of override. Immutable for audit integrity.';

-- Append-only history table for override governance.
-- Every override writes a new row here; UI dialog reads last 5 for the line to surface context.

CREATE TABLE IF NOT EXISTS greenhouse_commercial.quotation_line_cost_override_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id TEXT NOT NULL REFERENCES greenhouse_commercial.quotation_line_items(line_item_id) ON DELETE CASCADE,
  quotation_id TEXT NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE CASCADE,
  overridden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overridden_by_user_id TEXT,
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  suggested_unit_cost_usd NUMERIC(18,4),
  override_unit_cost_usd NUMERIC(18,4) NOT NULL,
  delta_pct NUMERIC(8,4),
  suggested_breakdown JSONB,
  override_breakdown JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT quotation_line_cost_override_history_category_check CHECK (
    category IN (
      'competitive_pressure',
      'strategic_investment',
      'roi_correction',
      'error_correction',
      'client_negotiation',
      'other'
    )
  ),
  CONSTRAINT quotation_line_cost_override_history_reason_length_check CHECK (
    char_length(reason) BETWEEN 15 AND 500
  ),
  CONSTRAINT quotation_line_cost_override_history_suggested_breakdown_check CHECK (
    suggested_breakdown IS NULL OR jsonb_typeof(suggested_breakdown) = 'object'
  ),
  CONSTRAINT quotation_line_cost_override_history_override_breakdown_check CHECK (
    override_breakdown IS NULL OR jsonb_typeof(override_breakdown) = 'object'
  ),
  CONSTRAINT quotation_line_cost_override_history_metadata_check CHECK (
    jsonb_typeof(metadata) = 'object'
  )
);

CREATE INDEX IF NOT EXISTS idx_quotation_line_cost_override_history_line
  ON greenhouse_commercial.quotation_line_cost_override_history(line_item_id, overridden_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotation_line_cost_override_history_quotation
  ON greenhouse_commercial.quotation_line_cost_override_history(quotation_id, overridden_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotation_line_cost_override_history_actor
  ON greenhouse_commercial.quotation_line_cost_override_history(overridden_by_user_id, overridden_at DESC)
  WHERE overridden_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotation_line_cost_override_history_category
  ON greenhouse_commercial.quotation_line_cost_override_history(category, overridden_at DESC);

COMMENT ON TABLE greenhouse_commercial.quotation_line_cost_override_history IS
  'Append-only history of manual cost overrides applied to quotation lines. Read by the Quote Builder override dialog (last 5 for the line) and by governance dashboards. See TASK-481 and GREENHOUSE_EVENT_CATALOG_V1 commercial.quotation_line.cost_overridden.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial.idx_quotation_line_cost_override_history_category;
DROP INDEX IF EXISTS greenhouse_commercial.idx_quotation_line_cost_override_history_actor;
DROP INDEX IF EXISTS greenhouse_commercial.idx_quotation_line_cost_override_history_quotation;
DROP INDEX IF EXISTS greenhouse_commercial.idx_quotation_line_cost_override_history_line;

DROP TABLE IF EXISTS greenhouse_commercial.quotation_line_cost_override_history;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_cost_override_coherence_check;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_cost_override_suggested_breakdown_check;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_cost_override_category_check;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP COLUMN IF EXISTS cost_override_suggested_breakdown,
  DROP COLUMN IF EXISTS cost_override_suggested_unit_cost_usd,
  DROP COLUMN IF EXISTS cost_override_delta_pct,
  DROP COLUMN IF EXISTS cost_override_at,
  DROP COLUMN IF EXISTS cost_override_by_user_id,
  DROP COLUMN IF EXISTS cost_override_category,
  DROP COLUMN IF EXISTS cost_override_reason;
