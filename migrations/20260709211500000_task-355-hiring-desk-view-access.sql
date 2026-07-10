-- Up Migration
-- TASK-355 — View registry + grants del Hiring Desk. Las rutas se incorporan
-- en el mismo cambio para mantener la gobernanza de reachability.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('gestion.hiring', 'gestion', 'Hiring Desk', 'Workspace interno de demandas, postulantes, decisiones y publicación de vacantes.', 'internal', '/agency/hiring', 'tabler-users-plus', 15, TRUE, 'migration:TASK-355'),
  ('gestion.hiring_demand', 'gestion', 'Hiring — Demanda', 'Demanda de talento, aperturas y ownership operativo.', 'internal', '/agency/hiring', 'tabler-briefcase-2', 16, TRUE, 'migration:TASK-355'),
  ('gestion.hiring_pipeline', 'gestion', 'Hiring — Pipeline', 'Pipeline kanban de postulaciones y etapas de selección.', 'internal', '/agency/hiring/pipeline', 'tabler-layout-kanban', 17, TRUE, 'migration:TASK-355'),
  ('gestion.hiring_publication', 'gestion', 'Hiring — Publicación', 'Gobierno del payload público y ciclo de publicación de openings.', 'internal', '/agency/hiring/publication', 'tabler-world-upload', 18, TRUE, 'migration:TASK-355'),
  ('gestion.hiring_application_detail', 'gestion', 'Hiring — Postulación 360', 'Detalle integral, assessment, documentos, decisión y actividad de una postulación.', 'internal', '/agency/hiring/applications/[applicationId]', 'tabler-user-search', 19, TRUE, 'migration:TASK-355')
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
  updated_by = 'migration:TASK-355';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
SELECT role_code, view_code, TRUE, 'migration:TASK-355', NOW(), NOW(), 'migration:TASK-355'
FROM (VALUES
  ('efeonce_admin'),
  ('hr_manager'),
  ('efeonce_operations'),
  ('efeonce_account')
) AS roles(role_code)
CROSS JOIN (VALUES
  ('gestion.hiring'),
  ('gestion.hiring_demand'),
  ('gestion.hiring_pipeline'),
  ('gestion.hiring_publication'),
  ('gestion.hiring_application_detail')
) AS views(view_code)
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-355';

DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.view_registry
  WHERE view_code LIKE 'gestion.hiring%' AND active = TRUE;

  IF registered_count <> 5 THEN
    RAISE EXCEPTION 'TASK-355 anti pre-up-marker: expected 5 active view codes, got %', registered_count;
  END IF;

  SELECT COUNT(*) INTO granted_count
  FROM greenhouse_core.role_view_assignments
  WHERE view_code LIKE 'gestion.hiring%' AND granted = TRUE;

  IF granted_count < 20 THEN
    RAISE EXCEPTION 'TASK-355 anti pre-up-marker: expected >=20 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-355:revert'
WHERE view_code LIKE 'gestion.hiring%';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-355:revert'
WHERE view_code LIKE 'gestion.hiring%';
