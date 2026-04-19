-- Up Migration

CREATE TABLE greenhouse_commercial.pricing_catalog_audit_log (
  audit_id text PRIMARY KEY DEFAULT 'pcaud-' || gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN (
    'sellable_role', 'tool_catalog', 'overhead_addon',
    'role_tier_margin', 'service_tier_margin',
    'commercial_model_multiplier', 'country_pricing_factor',
    'fte_hours_guide', 'employment_type'
  )),
  entity_id text NOT NULL,
  entity_sku text,
  action text NOT NULL CHECK (action IN (
    'created', 'updated', 'deactivated', 'reactivated',
    'cost_updated', 'pricing_updated', 'bulk_imported'
  )),
  actor_user_id text NOT NULL,
  actor_name text NOT NULL,
  change_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_from date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pc_audit_entity ON greenhouse_commercial.pricing_catalog_audit_log (entity_type, entity_id);
CREATE INDEX idx_pc_audit_actor ON greenhouse_commercial.pricing_catalog_audit_log (actor_user_id);
CREATE INDEX idx_pc_audit_created_at ON greenhouse_commercial.pricing_catalog_audit_log (created_at DESC);

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_commercial.pricing_catalog_audit_log TO greenhouse_runtime;

-- Down Migration
DROP TABLE IF EXISTS greenhouse_commercial.pricing_catalog_audit_log;
