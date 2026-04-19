-- Up Migration

-- TASK-465: Extend pricing_catalog_audit_log CHECK constraints to support
-- the service composition catalog (service_catalog entity) and the
-- recipe_updated action used by the service recipe PUT endpoint.

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

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  DROP CONSTRAINT IF EXISTS pricing_catalog_audit_log_action_check;

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  ADD CONSTRAINT pricing_catalog_audit_log_action_check
  CHECK (action IN (
    'created', 'updated', 'deactivated', 'reactivated',
    'cost_updated', 'pricing_updated', 'bulk_imported',
    'recipe_updated', 'deleted'
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
    'fte_hours_guide', 'employment_type'
  ));

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  DROP CONSTRAINT IF EXISTS pricing_catalog_audit_log_action_check;

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  ADD CONSTRAINT pricing_catalog_audit_log_action_check
  CHECK (action IN (
    'created', 'updated', 'deactivated', 'reactivated',
    'cost_updated', 'pricing_updated', 'bulk_imported'
  ));
