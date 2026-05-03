-- Up Migration

-- TASK-750: Seed `finanzas.ordenes_pago` view code en view_registry y
-- sus role grants para los 4 roles internos de finanzas que ya tienen
-- acceso a finanzas.banco. Idempotent (ON CONFLICT preserves
-- admin-edited assignments).

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('finanzas.ordenes_pago',
   'finanzas',
   'Órdenes de pago',
   'Convierte obligaciones financieras en órdenes auditables con maker-checker, programación y trazabilidad.',
   'finance',
   '/finance/payment-orders',
   'tabler-clipboard-list',
   55,
   TRUE,
   'migration:TASK-750')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-750';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',  'finanzas.ordenes_pago', true, 'migration:TASK-750', NOW(), NOW(), 'migration:TASK-750'),
  ('finance_admin',  'finanzas.ordenes_pago', true, 'migration:TASK-750', NOW(), NOW(), 'migration:TASK-750'),
  ('finance_manager','finanzas.ordenes_pago', true, 'migration:TASK-750', NOW(), NOW(), 'migration:TASK-750'),
  ('finance_analyst','finanzas.ordenes_pago', true, 'migration:TASK-750', NOW(), NOW(), 'migration:TASK-750')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-750';


-- Down Migration

DELETE FROM greenhouse_core.role_view_assignments
 WHERE view_code = 'finanzas.ordenes_pago'
   AND granted_by = 'migration:TASK-750';

DELETE FROM greenhouse_core.view_registry
 WHERE view_code = 'finanzas.ordenes_pago'
   AND updated_by = 'migration:TASK-750';
