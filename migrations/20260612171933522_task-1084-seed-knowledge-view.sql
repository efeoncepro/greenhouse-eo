-- Up Migration

-- TASK-1084 — Human Knowledge Center MVP.
-- Seeds the internal Knowledge workbench viewCode. The runtime /knowledge also
-- validates the tenant defensively; clients must never see this surface.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('plataforma.knowledge',
   'plataforma',
   'Knowledge',
   'Centro interno para buscar, leer y corregir conocimiento publicado con fuentes, freshness y feedback.',
   'internal',
   '/knowledge',
   'tabler-books',
   84,
   TRUE,
   'migration:TASK-1084')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1084';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',      'plataforma.knowledge', true, 'migration:TASK-1084', NOW(), NOW(), 'migration:TASK-1084'),
  ('finance_admin',      'plataforma.knowledge', true, 'migration:TASK-1084', NOW(), NOW(), 'migration:TASK-1084'),
  ('finance_analyst',    'plataforma.knowledge', true, 'migration:TASK-1084', NOW(), NOW(), 'migration:TASK-1084'),
  ('hr_payroll',         'plataforma.knowledge', true, 'migration:TASK-1084', NOW(), NOW(), 'migration:TASK-1084'),
  ('hr_manager',         'plataforma.knowledge', true, 'migration:TASK-1084', NOW(), NOW(), 'migration:TASK-1084'),
  ('efeonce_operations', 'plataforma.knowledge', true, 'migration:TASK-1084', NOW(), NOW(), 'migration:TASK-1084'),
  ('efeonce_account',    'plataforma.knowledge', true, 'migration:TASK-1084', NOW(), NOW(), 'migration:TASK-1084'),
  ('people_viewer',      'plataforma.knowledge', true, 'migration:TASK-1084', NOW(), NOW(), 'migration:TASK-1084'),
  ('ai_tooling_admin',   'plataforma.knowledge', true, 'migration:TASK-1084', NOW(), NOW(), 'migration:TASK-1084')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1084';

DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'plataforma.knowledge';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1084 anti pre-up-marker: plataforma.knowledge NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'plataforma.knowledge' AND granted = TRUE;
  IF granted_count < 9 THEN
    RAISE EXCEPTION 'TASK-1084 anti pre-up-marker: expected >=9 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1084:revert'
WHERE view_code = 'plataforma.knowledge';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1084:revert'
WHERE view_code = 'plataforma.knowledge';
