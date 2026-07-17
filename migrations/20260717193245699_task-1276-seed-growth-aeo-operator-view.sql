-- Up Migration

-- TASK-1276 — Seed del viewCode canónico `gestion.growth_aeo` para la vista OPERADOR del
-- programa AEO (nodos S8-S12 EPIC-020): cockpit /growth/aeo + detalle /growth/aeo/[organizationId].
-- NO vive bajo /admin (admin = salud de plataforma; Growth = programa cross-cliente).
-- Concedido SOLO al set operador — los mismos roles internos que ya poseen la capability
-- `growth.ai_visibility.report.read_operator` (TASK-1287 runtime.ts): efeonce_admin +
-- efeonce_account + efeonce_operations + ai_tooling_admin. NUNCA client_* (vista operador).

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('gestion.growth_aeo',
   'gestion',
   'AEO',
   'Cockpit operador del programa AEO: score y plan por cliente + cross-sell con diagnóstico real.',
   'internal',
   '/growth/aeo',
   'tabler-radar-2',
   44,
   TRUE,
   'migration:TASK-1276')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1276';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',      'gestion.growth_aeo', true, 'migration:TASK-1276', NOW(), NOW(), 'migration:TASK-1276'),
  ('efeonce_account',    'gestion.growth_aeo', true, 'migration:TASK-1276', NOW(), NOW(), 'migration:TASK-1276'),
  ('efeonce_operations', 'gestion.growth_aeo', true, 'migration:TASK-1276', NOW(), NOW(), 'migration:TASK-1276'),
  ('ai_tooling_admin',   'gestion.growth_aeo', true, 'migration:TASK-1276', NOW(), NOW(), 'migration:TASK-1276')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1276';

DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'gestion.growth_aeo';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1276 anti pre-up-marker: gestion.growth_aeo NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'gestion.growth_aeo' AND granted = TRUE;
  IF granted_count < 4 THEN
    RAISE EXCEPTION 'TASK-1276 anti pre-up-marker: expected >=4 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1276:revert'
WHERE view_code = 'gestion.growth_aeo';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1276:revert'
WHERE view_code = 'gestion.growth_aeo';
