-- TASK-727 follow-up: close role_view_assignments drift surfaced by Sentry.
-- Every row below is intentional: granted=true where the role should see the
-- newer surface, granted=false where route-group fallback was overbroad.

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_account', 'gestion.sample_sprints', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),

  ('efeonce_admin', 'gestion.sample_sprints', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'equipo.offboarding', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'equipo.onboarding', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'administracion.commercial_parties', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'administracion.product_sync_conflicts', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'administracion.product_catalog', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.pulse', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.proyectos', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.ciclos', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.configuracion', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.equipo', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.analytics', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.revisiones', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.actualizaciones', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.campanas', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.modulos', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('efeonce_admin', 'cliente.notificaciones', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),

  ('employee', 'gestion.agencia', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.organizaciones', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.servicios', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.staff_augmentation', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.spaces', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.economia', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.equipo', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.delivery', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.campanas', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.operaciones', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('employee', 'gestion.capacidad', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),

  ('finance_admin', 'gestion.sample_sprints', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('finance_analyst', 'gestion.sample_sprints', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('finance_analyst', 'administracion.instrumentos_pago', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),

  ('finance_manager', 'gestion.agencia', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('finance_manager', 'gestion.organizaciones', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('finance_manager', 'gestion.servicios', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('finance_manager', 'gestion.spaces', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('finance_manager', 'gestion.equipo', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('finance_manager', 'gestion.campanas', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('finance_manager', 'gestion.operaciones', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),

  ('hr_manager', 'equipo.offboarding', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_manager', 'equipo.onboarding', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),

  ('hr_payroll', 'gestion.agencia', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.organizaciones', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.servicios', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.staff_augmentation', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.spaces', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.economia', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.equipo', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.delivery', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.campanas', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.operaciones', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'gestion.capacidad', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'equipo.objetivos', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'equipo.evaluaciones', false, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'equipo.offboarding', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift'),
  ('hr_payroll', 'equipo.onboarding', true, 'migration:20260512-sentry-view-drift', NOW(), NOW(), 'migration:20260512-sentry-view-drift')
ON CONFLICT (role_code, view_code) DO UPDATE
SET granted = EXCLUDED.granted,
    updated_at = NOW(),
    updated_by = 'migration:20260512-sentry-view-drift';

INSERT INTO greenhouse_core.view_access_log
  (action, target_role, target_user, view_code, performed_by, reason, created_at)
SELECT
  CASE WHEN rva.granted THEN 'grant_role' ELSE 'revoke_role' END,
  rva.role_code,
  NULL,
  rva.view_code,
  'migration:20260512-sentry-view-drift',
  'Sentry remediation: explicit role_view_assignments for post-TASK-727 registry drift; removes route-group fallback grants.',
  NOW()
FROM greenhouse_core.role_view_assignments rva
WHERE rva.updated_by = 'migration:20260512-sentry-view-drift';

-- Down migration:
-- DELETE FROM greenhouse_core.view_access_log WHERE performed_by = 'migration:20260512-sentry-view-drift';
-- DELETE FROM greenhouse_core.role_view_assignments WHERE updated_by = 'migration:20260512-sentry-view-drift';
