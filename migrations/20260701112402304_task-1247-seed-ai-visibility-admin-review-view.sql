-- Up Migration

-- TASK-1247 — Seed del viewCode canónico `administracion.growth_ai_visibility`
-- para el Admin Review UI del AEO Grader en /admin/growth/ai-visibility (gate humano
-- pre-publicación, EPIC-020 F). Recurso internal/admin: concedido SOLO a los roles internos
-- que ya poseen la capability `growth.ai_visibility.report.review` (TASK-1244 runtime.ts):
-- efeonce_admin + ai_tooling_admin. NUNCA client_* roles (YMYL / gate interno).

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('administracion.growth_ai_visibility',
   'administracion',
   'AEO Grader',
   'Revisión humana de reportes de visibilidad en IA antes de publicarlos a un prospecto.',
   'admin',
   '/admin/growth/ai-visibility',
   'tabler-robot',
   43,
   TRUE,
   'migration:TASK-1247')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1247';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',    'administracion.growth_ai_visibility', true, 'migration:TASK-1247', NOW(), NOW(), 'migration:TASK-1247'),
  ('ai_tooling_admin', 'administracion.growth_ai_visibility', true, 'migration:TASK-1247', NOW(), NOW(), 'migration:TASK-1247')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1247';

DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'administracion.growth_ai_visibility';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1247 anti pre-up-marker: administracion.growth_ai_visibility NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'administracion.growth_ai_visibility' AND granted = TRUE;
  IF granted_count < 2 THEN
    RAISE EXCEPTION 'TASK-1247 anti pre-up-marker: expected >=2 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1247:revert'
WHERE view_code = 'administracion.growth_ai_visibility';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1247:revert'
WHERE view_code = 'administracion.growth_ai_visibility';
