-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_commercial.margin_targets (
  target_id text PRIMARY KEY DEFAULT ('mt-' || gen_random_uuid()::text),
  business_line_code text,
  target_margin_pct numeric(5,2) NOT NULL,
  floor_margin_pct numeric(5,2) NOT NULL,
  effective_from date NOT NULL,
  effective_until date,
  notes text,
  created_by text NOT NULL DEFAULT 'task-346-seed',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT margin_targets_floor_lte_target CHECK (floor_margin_pct <= target_margin_pct),
  CONSTRAINT margin_targets_target_in_range CHECK (target_margin_pct >= 0 AND target_margin_pct <= 100),
  CONSTRAINT margin_targets_floor_in_range CHECK (floor_margin_pct >= -100 AND floor_margin_pct <= 100),
  CONSTRAINT margin_targets_effective_range CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS margin_targets_unique_bl_effective
  ON greenhouse_commercial.margin_targets (COALESCE(business_line_code, '__global__'), effective_from);

CREATE INDEX IF NOT EXISTS margin_targets_bl_lookup
  ON greenhouse_commercial.margin_targets (business_line_code, effective_from DESC);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.role_rate_cards (
  rate_card_id text PRIMARY KEY DEFAULT ('rrc-' || gen_random_uuid()::text),
  business_line_code text,
  role_code text NOT NULL,
  seniority_level text NOT NULL DEFAULT 'mid'
    CHECK (seniority_level = ANY (ARRAY['junior'::text, 'mid'::text, 'senior'::text, 'lead'::text])),
  hourly_rate_cost numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'CLP'
    CHECK (currency = ANY (ARRAY['CLP'::text, 'USD'::text, 'CLF'::text])),
  effective_from date NOT NULL,
  effective_until date,
  notes text,
  created_by text NOT NULL DEFAULT 'task-346-seed',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_rate_cards_cost_positive CHECK (hourly_rate_cost >= 0),
  CONSTRAINT role_rate_cards_effective_range CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS role_rate_cards_unique_tuple
  ON greenhouse_commercial.role_rate_cards (
    COALESCE(business_line_code, '__global__'),
    role_code,
    seniority_level,
    effective_from
  );

CREATE INDEX IF NOT EXISTS role_rate_cards_lookup
  ON greenhouse_commercial.role_rate_cards (business_line_code, role_code, seniority_level, effective_from DESC);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.revenue_metric_config (
  config_id text PRIMARY KEY DEFAULT ('rmc-' || gen_random_uuid()::text),
  business_line_code text,
  hubspot_amount_metric text NOT NULL DEFAULT 'tcv'
    CHECK (hubspot_amount_metric = ANY (ARRAY['mrr'::text, 'arr'::text, 'tcv'::text, 'acv'::text])),
  pipeline_default_metric text NOT NULL DEFAULT 'mrr'
    CHECK (pipeline_default_metric = ANY (ARRAY['mrr'::text, 'arr'::text, 'tcv'::text, 'acv'::text])),
  active boolean NOT NULL DEFAULT TRUE,
  notes text,
  created_by text NOT NULL DEFAULT 'task-346-seed',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS revenue_metric_config_unique_bl
  ON greenhouse_commercial.revenue_metric_config (COALESCE(business_line_code, '__global__'));

ALTER TABLE greenhouse_commercial.margin_targets OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.role_rate_cards OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.revenue_metric_config OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.margin_targets TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.role_rate_cards TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.revenue_metric_config TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.margin_targets TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.role_rate_cards TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.revenue_metric_config TO greenhouse_migrator;

GRANT SELECT ON greenhouse_commercial.margin_targets TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.role_rate_cards TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.revenue_metric_config TO greenhouse_app;

-- Seed margin targets (global default + per business line)
INSERT INTO greenhouse_commercial.margin_targets (
  business_line_code,
  target_margin_pct,
  floor_margin_pct,
  effective_from,
  notes,
  created_by
)
VALUES
  (NULL, 25.00, 15.00, DATE '2026-01-01', 'Default global margin target (fallback when business line has no override).', 'task-346-seed'),
  ('wave', 28.00, 20.00, DATE '2026-01-01', 'Wave (delivery/ops) margin target.', 'task-346-seed'),
  ('reach', 18.00, 10.00, DATE '2026-01-01', 'Reach (media/pass-through) margin target.', 'task-346-seed'),
  ('globe', 40.00, 25.00, DATE '2026-01-01', 'Globe (creative/strategy) margin target.', 'task-346-seed'),
  ('efeonce_digital', 35.00, 20.00, DATE '2026-01-01', 'Efeonce Digital (consulting) margin target.', 'task-346-seed'),
  ('crm_solutions', 30.00, 18.00, DATE '2026-01-01', 'CRM Solutions (platform + services) margin target.', 'task-346-seed')
ON CONFLICT (COALESCE(business_line_code, '__global__'), effective_from) DO NOTHING;

-- Seed revenue metric config (global + per BL)
INSERT INTO greenhouse_commercial.revenue_metric_config (
  business_line_code,
  hubspot_amount_metric,
  pipeline_default_metric,
  active,
  notes,
  created_by
)
VALUES
  (NULL, 'tcv', 'mrr', TRUE, 'Global default: TCV to HubSpot, MRR as pipeline view.', 'task-346-seed'),
  ('wave', 'tcv', 'mrr', TRUE, 'Delivery contracts with defined duration.', 'task-346-seed'),
  ('reach', 'mrr', 'mrr', TRUE, 'Pass-through media: TCV distorts revenue reality.', 'task-346-seed'),
  ('globe', 'tcv', 'arr', TRUE, 'Creative annual contracts: ARR best fits pipeline narrative.', 'task-346-seed'),
  ('efeonce_digital', 'arr', 'mrr', TRUE, 'Consulting with annual-value view.', 'task-346-seed'),
  ('crm_solutions', 'tcv', 'mrr', TRUE, 'Platform + services: TCV captures full contract.', 'task-346-seed')
ON CONFLICT (COALESCE(business_line_code, '__global__')) DO NOTHING;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.revenue_metric_config;
DROP TABLE IF EXISTS greenhouse_commercial.role_rate_cards;
DROP TABLE IF EXISTS greenhouse_commercial.margin_targets;
