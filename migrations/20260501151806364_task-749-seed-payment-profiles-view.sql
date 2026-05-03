-- Up Migration

-- TASK-749: Seed `finanzas.perfiles_pago` view code en view_registry y
-- sus role grants para los 4 roles internos de finanzas.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('finanzas.perfiles_pago',
   'finanzas',
   'Perfiles de pago',
   'Perfiles versionados de pago por colaborador, accionista o proveedor con maker-checker.',
   'finance',
   '/finance/payment-profiles',
   'tabler-id-badge',
   56,
   TRUE,
   'migration:TASK-749')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-749';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',  'finanzas.perfiles_pago', true, 'migration:TASK-749', NOW(), NOW(), 'migration:TASK-749'),
  ('finance_admin',  'finanzas.perfiles_pago', true, 'migration:TASK-749', NOW(), NOW(), 'migration:TASK-749'),
  ('finance_manager','finanzas.perfiles_pago', true, 'migration:TASK-749', NOW(), NOW(), 'migration:TASK-749'),
  ('finance_analyst','finanzas.perfiles_pago', true, 'migration:TASK-749', NOW(), NOW(), 'migration:TASK-749')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-749';


-- Down Migration

DELETE FROM greenhouse_core.role_view_assignments
 WHERE view_code = 'finanzas.perfiles_pago'
   AND granted_by = 'migration:TASK-749';

DELETE FROM greenhouse_core.view_registry
 WHERE view_code = 'finanzas.perfiles_pago'
   AND updated_by = 'migration:TASK-749';
