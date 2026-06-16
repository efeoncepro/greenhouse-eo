-- Up Migration

-- TASK-1153 — Seed del viewCode canónico `plataforma.roadmap` (cockpit del backlog
-- operativo, /roadmap, FUERA de Admin). Recurso interno transversal: concedido a
-- TODOS los roles funcionales internos + `collaborator` + `designer`, NUNCA a
-- client_* (los clientes no ven el roadmap; redirect defensivo por tenantType en el
-- page guard). Patrón View Registry Governance (espejo TASK-1070/827).

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('plataforma.roadmap',
   'plataforma',
   'Roadmap',
   'Cockpit del backlog operativo (epics, tasks, mini-tasks e incidentes) leído del índice Markdown read-only. Recurso interno transversal — clientes no acceden.',
   'internal',
   '/roadmap',
   'tabler-map-2',
   9,
   TRUE,
   'migration:TASK-1153')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1153';

-- Grant a TODOS los roles internos + collaborator + designer. NO client_* roles.
INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',      'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('finance_admin',      'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('finance_analyst',    'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('hr_payroll',         'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('hr_manager',         'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('efeonce_operations', 'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('efeonce_account',    'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('people_viewer',      'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('ai_tooling_admin',   'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('collaborator',       'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153'),
  ('designer',           'plataforma.roadmap', true, 'migration:TASK-1153', NOW(), NOW(), 'migration:TASK-1153')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1153';

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule).
DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'plataforma.roadmap';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1153 anti pre-up-marker: plataforma.roadmap NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'plataforma.roadmap' AND granted = TRUE;
  IF granted_count < 11 THEN
    RAISE EXCEPTION 'TASK-1153 anti pre-up-marker: expected >=11 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

-- Revoke (append-only, NO row deletes).
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1153:revert'
WHERE view_code = 'plataforma.roadmap';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1153:revert'
WHERE view_code = 'plataforma.roadmap';
