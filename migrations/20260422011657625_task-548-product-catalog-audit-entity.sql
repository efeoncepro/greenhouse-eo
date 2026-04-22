-- Up Migration

-- TASK-548: allow pricing_catalog_audit_log to audit `product_catalog`
-- actions from the product sync conflict resolution lane.

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  DROP CONSTRAINT IF EXISTS pricing_catalog_audit_log_entity_type_check;

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  ADD CONSTRAINT pricing_catalog_audit_log_entity_type_check
  CHECK (entity_type IN (
    'sellable_role', 'tool_catalog', 'overhead_addon',
    'role_tier_margin', 'service_tier_margin',
    'commercial_model_multiplier', 'country_pricing_factor',
    'fte_hours_guide', 'employment_type',
    'service_catalog',
    'product_catalog'
  ));

-- Down Migration

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  DROP CONSTRAINT IF EXISTS pricing_catalog_audit_log_entity_type_check;

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  ADD CONSTRAINT pricing_catalog_audit_log_entity_type_check
  CHECK (entity_type IN (
    'sellable_role', 'tool_catalog', 'overhead_addon',
    'role_tier_margin', 'service_tier_margin',
    'commercial_model_multiplier', 'country_pricing_factor',
    'fte_hours_guide', 'employment_type',
    'service_catalog'
  ));
