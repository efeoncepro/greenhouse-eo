-- Up Migration

-- TASK-471 Governance extension: 3 nuevos action values para el audit enum.
--  * `reverted`        → slice 2, audit row emitida tras un one-click revert
--  * `approval_applied` → slice 5, audit row emitida tras la aplicación de
--                         un cambio aprobado por maker-checker
--  * `bulk_edited`     → slice 3, audit row emitida por cada entity tocada
--                         en un bulk edit (distinto de bulk_imported que es
--                         origen externo Excel)
-- El enum se amplía; rows históricos quedan intactos.

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  DROP CONSTRAINT IF EXISTS pricing_catalog_audit_log_action_check;

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  ADD CONSTRAINT pricing_catalog_audit_log_action_check
  CHECK (action IN (
    'created', 'updated', 'deactivated', 'reactivated',
    'cost_updated', 'pricing_updated', 'bulk_imported',
    'recipe_updated', 'deleted',
    'reverted', 'approval_applied', 'bulk_edited'
  ));

COMMENT ON COLUMN greenhouse_commercial.pricing_catalog_audit_log.action IS
  'Acción auditada. 12 valores: 9 operacionales (created, updated, deactivated, reactivated, cost_updated, pricing_updated, bulk_imported, recipe_updated, deleted) + 3 governance (reverted, approval_applied, bulk_edited) agregados en TASK-471.';

-- Down Migration

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  DROP CONSTRAINT IF EXISTS pricing_catalog_audit_log_action_check;

ALTER TABLE greenhouse_commercial.pricing_catalog_audit_log
  ADD CONSTRAINT pricing_catalog_audit_log_action_check
  CHECK (action IN (
    'created', 'updated', 'deactivated', 'reactivated',
    'cost_updated', 'pricing_updated', 'bulk_imported',
    'recipe_updated', 'deleted'
  ));
