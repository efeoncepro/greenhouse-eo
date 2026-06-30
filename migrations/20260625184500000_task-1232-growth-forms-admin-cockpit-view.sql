-- Up Migration

-- TASK-1232 — Seed del viewCode canónico `administracion.growth_forms`
-- para el cockpit interno /admin/growth/forms. Recurso internal/admin:
-- concedido a roles operativos internos que ya poseen capabilities
-- growth.forms.*. NO client_* roles.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('administracion.growth_forms',
   'administracion',
   'Growth Forms',
   'Control plane de formularios públicos, submissions, destinos y host surfaces.',
   'admin',
   '/admin/growth/forms',
   'tabler-forms',
   42,
   TRUE,
   'migration:TASK-1232')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1232';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',      'administracion.growth_forms', true, 'migration:TASK-1232', NOW(), NOW(), 'migration:TASK-1232'),
  ('efeonce_operations', 'administracion.growth_forms', true, 'migration:TASK-1232', NOW(), NOW(), 'migration:TASK-1232'),
  ('efeonce_account',    'administracion.growth_forms', true, 'migration:TASK-1232', NOW(), NOW(), 'migration:TASK-1232')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1232';

DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'administracion.growth_forms';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1232 anti pre-up-marker: administracion.growth_forms NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'administracion.growth_forms' AND granted = TRUE;
  IF granted_count < 3 THEN
    RAISE EXCEPTION 'TASK-1232 anti pre-up-marker: expected >=3 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1232:revert'
WHERE view_code = 'administracion.growth_forms';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1232:revert'
WHERE view_code = 'administracion.growth_forms';
