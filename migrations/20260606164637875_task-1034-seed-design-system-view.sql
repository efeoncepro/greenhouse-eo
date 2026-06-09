-- Up Migration

-- TASK-1034 — Canonical internal Design System reference (/admin/design-system).
-- Seeds the viewCode for the AXIS palette reference page (View Registry Governance
-- Pattern, espejo TASK-827/1022). INTERNAL ONLY — granted to internal functional
-- roles, NEVER to client_* roles (clients must not see the design system).
-- routeGroup 'internal'; the page guard also defensively redirects client tenants.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('administracion.design_system',
   'administracion',
   'Design System',
   'Referencia viva de la paleta AXIS (ramps 100-900, semánticos, neutrales). Interno — clientes no acceden.',
   'internal',
   '/admin/design-system',
   'tabler-palette',
   90,
   TRUE,
   'migration:TASK-1034')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1034';

-- Grant to internal functional roles only (route_group internal). NO client_* roles.
INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',      'administracion.design_system', true, 'migration:TASK-1034', NOW(), NOW(), 'migration:TASK-1034'),
  ('finance_admin',      'administracion.design_system', true, 'migration:TASK-1034', NOW(), NOW(), 'migration:TASK-1034'),
  ('finance_analyst',    'administracion.design_system', true, 'migration:TASK-1034', NOW(), NOW(), 'migration:TASK-1034'),
  ('hr_payroll',         'administracion.design_system', true, 'migration:TASK-1034', NOW(), NOW(), 'migration:TASK-1034'),
  ('hr_manager',         'administracion.design_system', true, 'migration:TASK-1034', NOW(), NOW(), 'migration:TASK-1034'),
  ('efeonce_operations', 'administracion.design_system', true, 'migration:TASK-1034', NOW(), NOW(), 'migration:TASK-1034'),
  ('efeonce_account',    'administracion.design_system', true, 'migration:TASK-1034', NOW(), NOW(), 'migration:TASK-1034'),
  ('people_viewer',      'administracion.design_system', true, 'migration:TASK-1034', NOW(), NOW(), 'migration:TASK-1034'),
  ('ai_tooling_admin',   'administracion.design_system', true, 'migration:TASK-1034', NOW(), NOW(), 'migration:TASK-1034')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1034';

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule).
DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'administracion.design_system';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1034 anti pre-up-marker: administracion.design_system NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'administracion.design_system' AND granted = TRUE;
  IF granted_count < 9 THEN
    RAISE EXCEPTION 'TASK-1034 anti pre-up-marker: expected >=9 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

-- Append-only governance: revoke (granted=FALSE) preserving audit trail, NO row deletes.
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1034:revert'
WHERE view_code = 'administracion.design_system';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1034:revert'
WHERE view_code = 'administracion.design_system';
