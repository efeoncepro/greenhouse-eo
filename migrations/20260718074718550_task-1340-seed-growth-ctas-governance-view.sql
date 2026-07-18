-- Up Migration

-- TASK-1340 — Seed del viewCode canónico `gestion.growth_ctas` para la superficie de
-- GOBERNANZA del motor de CTAs bajo el menú Growth (/growth/ctas): inventario de CTAs
-- con estado, acciones de lifecycle (publish/pause/resume vía la API admin TASK-1339,
-- gateadas por capability fina growth.cta.*) y preview del renderer. Delta del operador
-- 2026-07-18: la gobernanza vive en Growth, NO en /admin/design-system. Concedido SOLO
-- al set operador growth (mismos roles con grants growth.cta.* en runtime.ts):
-- efeonce_admin + efeonce_account + efeonce_operations. NUNCA client_*.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('gestion.growth_ctas',
   'gestion',
   'CTAs',
   'Gobernanza del motor de CTAs/popups: inventario con estado, lifecycle y preview del renderer portable.',
   'internal',
   '/growth/ctas',
   'tabler-hand-click',
   45,
   TRUE,
   'migration:TASK-1340')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1340';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',      'gestion.growth_ctas', true, 'migration:TASK-1340', NOW(), NOW(), 'migration:TASK-1340'),
  ('efeonce_account',    'gestion.growth_ctas', true, 'migration:TASK-1340', NOW(), NOW(), 'migration:TASK-1340'),
  ('efeonce_operations', 'gestion.growth_ctas', true, 'migration:TASK-1340', NOW(), NOW(), 'migration:TASK-1340')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1340';

DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'gestion.growth_ctas';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1340 anti pre-up-marker: gestion.growth_ctas NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'gestion.growth_ctas' AND granted = TRUE;
  IF granted_count < 3 THEN
    RAISE EXCEPTION 'TASK-1340 anti pre-up-marker: expected >=3 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1340:revert'
WHERE view_code = 'gestion.growth_ctas';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1340:revert'
WHERE view_code = 'gestion.growth_ctas';
