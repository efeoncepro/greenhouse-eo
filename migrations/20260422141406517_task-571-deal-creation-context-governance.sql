-- Up Migration
--
-- TASK-571 — Deal Creation Context Registry + Pipeline/Stage Governance
--
-- Extends the HubSpot deal pipeline registry with UX + governance metadata
-- (labels, ordering, selectability, active, default-for-create) and adds a
-- policy layer for resolving defaults by scope (global / tenant / business
-- line). The bootstrap side-effect in ensureHubSpotDealPipelineConfig
-- (deals-store.ts) stays as first line of defense; these columns are
-- managed manually or by future admin surfaces.

SET search_path = greenhouse_commercial, greenhouse_core, greenhouse_crm, public;

-- ---------------------------------------------------------------------------
-- Slice 1.a — Extend hubspot_deal_pipeline_config with governance metadata
-- ---------------------------------------------------------------------------

ALTER TABLE greenhouse_commercial.hubspot_deal_pipeline_config
  ADD COLUMN IF NOT EXISTS pipeline_label text,
  ADD COLUMN IF NOT EXISTS pipeline_display_order integer,
  ADD COLUMN IF NOT EXISTS pipeline_active boolean NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS stage_display_order integer,
  ADD COLUMN IF NOT EXISTS is_open_selectable boolean NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_default_for_create boolean NOT NULL DEFAULT FALSE;

-- Stages that are already closed should never be offered as "create into"
-- targets. Keep backfill defensive.
UPDATE greenhouse_commercial.hubspot_deal_pipeline_config
   SET is_open_selectable = FALSE
 WHERE is_closed = TRUE
   AND is_open_selectable IS DISTINCT FROM FALSE;

-- greenhouse_crm.deals does not carry a pipeline name column today — only
-- stage_name. Seed pipeline_label with the raw pipeline_id so the registry
-- stays non-null and readable. Operators can override it later via admin
-- SQL or a future governance surface.
UPDATE greenhouse_commercial.hubspot_deal_pipeline_config AS cfg
   SET pipeline_label = COALESCE(cfg.pipeline_label, cfg.pipeline_id)
 WHERE cfg.pipeline_label IS NULL;

CREATE INDEX IF NOT EXISTS idx_hubspot_deal_pipeline_config_active_pipeline
  ON greenhouse_commercial.hubspot_deal_pipeline_config (pipeline_id)
  WHERE pipeline_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_hubspot_deal_pipeline_config_selectable
  ON greenhouse_commercial.hubspot_deal_pipeline_config (pipeline_id, stage_display_order)
  WHERE is_open_selectable = TRUE AND is_closed = FALSE;

-- Only one default stage per pipeline is allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hubspot_deal_pipeline_config_default_stage
  ON greenhouse_commercial.hubspot_deal_pipeline_config (pipeline_id)
  WHERE is_default_for_create = TRUE;

-- ---------------------------------------------------------------------------
-- Slice 1.b — Policy table for tenant / business line defaults
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS greenhouse_commercial.hubspot_deal_pipeline_defaults (
  scope text NOT NULL,
  scope_key text NOT NULL,
  pipeline_id text NOT NULL,
  stage_id text,
  owner_hubspot_user_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, scope_key, pipeline_id),
  CONSTRAINT hubspot_deal_pipeline_defaults_scope_values CHECK (
    scope IN ('global', 'tenant', 'business_line')
  ),
  CONSTRAINT hubspot_deal_pipeline_defaults_scope_key_nonempty CHECK (
    length(trim(scope_key)) > 0
  )
);

-- Global defaults use scope_key = '__global__' so the PK stays NOT NULL and
-- we don't lose the ability to store per-tenant/per-BU rows alongside the
-- global fallback.
CREATE INDEX IF NOT EXISTS idx_hubspot_deal_pipeline_defaults_scope
  ON greenhouse_commercial.hubspot_deal_pipeline_defaults (scope, scope_key);

CREATE OR REPLACE FUNCTION greenhouse_commercial.touch_hubspot_deal_pipeline_defaults_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hubspot_deal_pipeline_defaults_touch_updated_at
  ON greenhouse_commercial.hubspot_deal_pipeline_defaults;
CREATE TRIGGER trg_hubspot_deal_pipeline_defaults_touch_updated_at
  BEFORE UPDATE ON greenhouse_commercial.hubspot_deal_pipeline_defaults
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_commercial.touch_hubspot_deal_pipeline_defaults_updated_at();

ALTER TABLE greenhouse_commercial.hubspot_deal_pipeline_defaults OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.hubspot_deal_pipeline_defaults TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.hubspot_deal_pipeline_defaults TO greenhouse_migrator;
GRANT SELECT ON greenhouse_commercial.hubspot_deal_pipeline_defaults TO greenhouse_app;

-- Down Migration

DROP TRIGGER IF EXISTS trg_hubspot_deal_pipeline_defaults_touch_updated_at
  ON greenhouse_commercial.hubspot_deal_pipeline_defaults;
DROP FUNCTION IF EXISTS greenhouse_commercial.touch_hubspot_deal_pipeline_defaults_updated_at();
DROP TABLE IF EXISTS greenhouse_commercial.hubspot_deal_pipeline_defaults;

DROP INDEX IF EXISTS greenhouse_commercial.uq_hubspot_deal_pipeline_config_default_stage;
DROP INDEX IF EXISTS greenhouse_commercial.idx_hubspot_deal_pipeline_config_selectable;
DROP INDEX IF EXISTS greenhouse_commercial.idx_hubspot_deal_pipeline_config_active_pipeline;

ALTER TABLE greenhouse_commercial.hubspot_deal_pipeline_config
  DROP COLUMN IF EXISTS is_default_for_create,
  DROP COLUMN IF EXISTS is_open_selectable,
  DROP COLUMN IF EXISTS stage_display_order,
  DROP COLUMN IF EXISTS pipeline_active,
  DROP COLUMN IF EXISTS pipeline_display_order,
  DROP COLUMN IF EXISTS pipeline_label;
