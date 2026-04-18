-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_core, greenhouse_crm, greenhouse_finance, greenhouse_sync, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.hubspot_deal_pipeline_config (
  pipeline_id text NOT NULL,
  stage_id text NOT NULL,
  stage_label text NOT NULL,
  probability_pct numeric(5,2),
  is_closed boolean NOT NULL DEFAULT FALSE,
  is_won boolean NOT NULL DEFAULT FALSE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (pipeline_id, stage_id),
  CONSTRAINT hubspot_deal_pipeline_config_probability_bounds CHECK (
    probability_pct IS NULL OR (probability_pct >= 0 AND probability_pct <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_hubspot_deal_pipeline_config_lookup
  ON greenhouse_commercial.hubspot_deal_pipeline_config (pipeline_id, stage_id);

INSERT INTO greenhouse_commercial.hubspot_deal_pipeline_config (
  pipeline_id,
  stage_id,
  stage_label,
  probability_pct,
  is_closed,
  is_won,
  notes
)
SELECT
  d.pipeline_id,
  d.stage_id,
  COALESCE(NULLIF(trim(d.stage_name), ''), d.stage_id) AS stage_label,
  CASE
    WHEN bool_or(COALESCE(d.is_closed_won, FALSE)) THEN 100
    WHEN bool_or(COALESCE(d.is_closed_lost, FALSE)) THEN 0
    ELSE NULL
  END AS probability_pct,
  bool_or(COALESCE(d.is_closed_won, FALSE) OR COALESCE(d.is_closed_lost, FALSE)) AS is_closed,
  bool_or(COALESCE(d.is_closed_won, FALSE)) AS is_won,
  'Bootstrapped from greenhouse_crm.deals during TASK-453 migration' AS notes
FROM greenhouse_crm.deals AS d
WHERE d.pipeline_id IS NOT NULL
  AND d.stage_id IS NOT NULL
GROUP BY d.pipeline_id, d.stage_id, COALESCE(NULLIF(trim(d.stage_name), ''), d.stage_id)
ON CONFLICT (pipeline_id, stage_id) DO NOTHING;

CREATE OR REPLACE FUNCTION greenhouse_commercial.touch_hubspot_deal_pipeline_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hubspot_deal_pipeline_config_touch_updated_at
  ON greenhouse_commercial.hubspot_deal_pipeline_config;
CREATE TRIGGER trg_hubspot_deal_pipeline_config_touch_updated_at
  BEFORE UPDATE ON greenhouse_commercial.hubspot_deal_pipeline_config
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_commercial.touch_hubspot_deal_pipeline_config_updated_at();

CREATE OR REPLACE FUNCTION greenhouse_commercial.apply_deal_stage_config()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  stage_cfg record;
BEGIN
  SELECT probability_pct, is_closed, is_won
  INTO stage_cfg
  FROM greenhouse_commercial.hubspot_deal_pipeline_config
  WHERE pipeline_id = COALESCE(NULLIF(NEW.hubspot_pipeline_id, ''), 'default')
    AND stage_id = NEW.dealstage
  LIMIT 1;

  IF FOUND THEN
    NEW.probability_pct := COALESCE(
      stage_cfg.probability_pct,
      NEW.probability_pct,
      CASE
        WHEN stage_cfg.is_won THEN 100
        WHEN stage_cfg.is_closed THEN 0
        ELSE NULL
      END
    );
    NEW.is_closed := COALESCE(stage_cfg.is_closed, NEW.is_closed, FALSE);
    NEW.is_won := COALESCE(stage_cfg.is_won, NEW.is_won, FALSE);
  ELSE
    NEW.is_closed := COALESCE(NEW.is_closed, FALSE);
    NEW.is_won := COALESCE(NEW.is_won, FALSE);

    IF NEW.probability_pct IS NULL THEN
      NEW.probability_pct := CASE
        WHEN NEW.is_won THEN 100
        WHEN NEW.is_closed THEN 0
        ELSE NULL
      END;
    END IF;
  END IF;

  IF NEW.is_won THEN
    NEW.is_closed := TRUE;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.deals (
  deal_id text PRIMARY KEY DEFAULT ('dl-' || gen_random_uuid()::text),
  hubspot_deal_id text NOT NULL UNIQUE,
  hubspot_pipeline_id text,
  client_id text REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  organization_id text REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  deal_name text NOT NULL,
  dealstage text NOT NULL,
  dealstage_label text,
  pipeline_name text,
  deal_type text,
  amount numeric(18,2),
  amount_clp numeric(18,2),
  currency text NOT NULL DEFAULT 'CLP',
  exchange_rate_to_clp numeric(12,6),
  close_date date,
  probability_pct numeric(5,2),
  is_closed boolean NOT NULL DEFAULT FALSE,
  is_won boolean NOT NULL DEFAULT FALSE,
  is_deleted boolean NOT NULL DEFAULT FALSE,
  deal_owner_hubspot_user_id text,
  deal_owner_user_id text,
  deal_owner_email text,
  created_in_hubspot_at timestamptz,
  hubspot_last_synced_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT commercial_deals_amount_non_negative CHECK (amount IS NULL OR amount >= 0),
  CONSTRAINT commercial_deals_amount_clp_non_negative CHECK (amount_clp IS NULL OR amount_clp >= 0),
  CONSTRAINT commercial_deals_exchange_rate_positive CHECK (exchange_rate_to_clp IS NULL OR exchange_rate_to_clp > 0),
  CONSTRAINT commercial_deals_probability_bounds CHECK (
    probability_pct IS NULL OR (probability_pct >= 0 AND probability_pct <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_commercial_deals_client
  ON greenhouse_commercial.deals (client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_deals_organization
  ON greenhouse_commercial.deals (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_deals_space
  ON greenhouse_commercial.deals (space_id)
  WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_deals_stage
  ON greenhouse_commercial.deals (dealstage);

CREATE INDEX IF NOT EXISTS idx_commercial_deals_open
  ON greenhouse_commercial.deals (close_date, dealstage)
  WHERE is_closed = FALSE AND is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_commercial_deals_apply_stage_config
  ON greenhouse_commercial.deals;
CREATE TRIGGER trg_commercial_deals_apply_stage_config
  BEFORE INSERT OR UPDATE ON greenhouse_commercial.deals
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_commercial.apply_deal_stage_config();

ALTER TABLE greenhouse_commercial.hubspot_deal_pipeline_config OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.deals OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.hubspot_deal_pipeline_config TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.deals TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.hubspot_deal_pipeline_config TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.deals TO greenhouse_migrator;

GRANT SELECT ON greenhouse_commercial.hubspot_deal_pipeline_config TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.deals TO greenhouse_app;

-- Down Migration

DROP TRIGGER IF EXISTS trg_commercial_deals_apply_stage_config
  ON greenhouse_commercial.deals;
DROP TRIGGER IF EXISTS trg_hubspot_deal_pipeline_config_touch_updated_at
  ON greenhouse_commercial.hubspot_deal_pipeline_config;

DROP TABLE IF EXISTS greenhouse_commercial.deals;
DROP TABLE IF EXISTS greenhouse_commercial.hubspot_deal_pipeline_config;

DROP FUNCTION IF EXISTS greenhouse_commercial.apply_deal_stage_config();
DROP FUNCTION IF EXISTS greenhouse_commercial.touch_hubspot_deal_pipeline_config_updated_at();
