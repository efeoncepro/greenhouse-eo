-- Up Migration

-- TASK-1413 — Seed del viewCode `administracion.commercial_proposals` para la ventana operador
-- de Proposal Studio en /admin/commercial/proposals (lista + historial de versiones + descarga).
-- Recurso internal/admin: concedido SOLO a los roles que ya poseen la capability
-- `commercial.proposal.read` (runtime.ts): efeonce_admin + efeonce_account. NUNCA client_*
-- (los artefactos `internal` llevan loaded cost y piso de negociación).

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('administracion.commercial_proposals',
   'administracion',
   'Propuestas',
   'Propuestas comerciales: estado, historial de versiones por artefacto y descarga gobernada.',
   'admin',
   '/admin/commercial/proposals',
   'tabler-files',
   44,
   TRUE,
   'migration:TASK-1413')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1413';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',   'administracion.commercial_proposals', true, 'migration:TASK-1413', NOW(), NOW(), 'migration:TASK-1413'),
  ('efeonce_account', 'administracion.commercial_proposals', true, 'migration:TASK-1413', NOW(), NOW(), 'migration:TASK-1413')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1413';

DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'administracion.commercial_proposals';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1413 anti pre-up-marker: administracion.commercial_proposals NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'administracion.commercial_proposals' AND granted = TRUE;
  IF granted_count < 2 THEN
    RAISE EXCEPTION 'TASK-1413 anti pre-up-marker: expected >=2 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1413:revert'
WHERE view_code = 'administracion.commercial_proposals';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1413:revert'
WHERE view_code = 'administracion.commercial_proposals';
