-- Up Migration

-- TASK-753 / TASK-784 hardening:
-- The code catalog added two personal `mi_ficha` views after TASK-727, but
-- the persisted access plane must also know them. This keeps JWT
-- authorizedViews, menu discovery, page guards, and self-service APIs aligned.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('mi_ficha.mi_cuenta_pago',
   'mi_ficha',
   'Mi cuenta de pago',
   'Perfil de pago y solicitud de cambio self-service.',
   'my',
   '/my/payment-profile',
   'tabler-credit-card',
   13,
   TRUE,
   'migration:TASK-753'),
  ('mi_ficha.onboarding',
   'mi_ficha',
   'Mi onboarding',
   'Tareas personales asignadas en checklists de entrada o salida.',
   'my',
   '/my/onboarding',
   'tabler-list-check',
   14,
   TRUE,
   'migration:TASK-753')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-753';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
SELECT role_code, view_code, TRUE, 'migration:TASK-753', NOW(), NOW(), 'migration:TASK-753'
FROM (
  VALUES
    ('efeonce_admin'),
    ('efeonce_operations'),
    ('efeonce_account'),
    ('collaborator'),
    ('employee'),
    ('finance_admin'),
    ('finance_analyst'),
    ('finance_manager'),
    ('hr_payroll'),
    ('hr_manager')
) AS roles(role_code)
CROSS JOIN (
  VALUES
    ('mi_ficha.mi_cuenta_pago'),
    ('mi_ficha.onboarding')
) AS views(view_code)
ON CONFLICT (role_code, view_code) DO NOTHING;

-- Down Migration

DELETE FROM greenhouse_core.role_view_assignments
 WHERE view_code IN ('mi_ficha.mi_cuenta_pago', 'mi_ficha.onboarding')
   AND granted_by = 'migration:TASK-753';

DELETE FROM greenhouse_core.view_registry
 WHERE view_code IN ('mi_ficha.mi_cuenta_pago', 'mi_ficha.onboarding')
   AND updated_by = 'migration:TASK-753';
