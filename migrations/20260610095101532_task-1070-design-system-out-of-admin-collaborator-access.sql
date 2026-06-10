-- Up Migration

-- TASK-1070 — Move the internal Design System out of Admin Center.
-- The Design System is a cross-cutting INTERNAL resource (everyone who builds or
-- consumes UI), not an Admin domain. This migration:
--   1. Seeds the new canonical viewCode `plataforma.design_system` at /design-system
--      (out of /admin/), granted to ALL internal functional roles + `collaborator`
--      so every internal staff member can see it. NEVER client_* (clients must not
--      see the design system — defensive tenantType redirect stays in the guards).
--   2. Leaves the legacy `administracion.design_system` viewCode AS-IS (still
--      active + granted). The Cloud SQL instance is shared across runtimes, so
--      revoking it now would break production (old code still reads it + still
--      serves /admin/design-system) until the new code deploys. The legacy
--      viewCode becomes harmless dead-weight; a FOLLOW-UP cleanup migration
--      revokes it AFTER production ships this PR. (Deploy-ordering safety,
--      mirror TASK-991.)
-- View Registry Governance Pattern (espejo TASK-827/1034). A future DESIGNER role
-- can narrow this later by flipping the `collaborator` grant — reversible by design.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('plataforma.design_system',
   'plataforma',
   'Design System',
   'Catálogo interno de AXIS: tokens, primitives, patrones y labs. Recurso interno transversal — clientes no acceden.',
   'internal',
   '/design-system',
   'tabler-palette',
   10,
   TRUE,
   'migration:TASK-1070')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1070';

-- Grant to ALL internal functional roles + collaborator. NO client_* roles.
INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',      'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070'),
  ('finance_admin',      'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070'),
  ('finance_analyst',    'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070'),
  ('hr_payroll',         'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070'),
  ('hr_manager',         'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070'),
  ('efeonce_operations', 'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070'),
  ('efeonce_account',    'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070'),
  ('people_viewer',      'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070'),
  ('ai_tooling_admin',   'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070'),
  ('collaborator',       'plataforma.design_system', true, 'migration:TASK-1070', NOW(), NOW(), 'migration:TASK-1070')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1070';

-- NOTE: the legacy `administracion.design_system` viewCode is intentionally left
-- active + granted here (deploy-ordering safety on the shared Cloud SQL instance).
-- A follow-up cleanup migration revokes it AFTER this PR ships to production.

-- Anti pre-up-marker guard (CLAUDE.md migration markers rule).
DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'plataforma.design_system';
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1070 anti pre-up-marker: plataforma.design_system NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'plataforma.design_system' AND granted = TRUE;
  IF granted_count < 10 THEN
    RAISE EXCEPTION 'TASK-1070 anti pre-up-marker: expected >=10 role grants (incl collaborator), got %', granted_count;
  END IF;
END
$$;

-- Down Migration

-- Revoke the new viewCode (append-only, NO row deletes). The legacy viewCode was
-- never touched by Up, so nothing to restore there.
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1070:revert'
WHERE view_code = 'plataforma.design_system';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1070:revert'
WHERE view_code = 'plataforma.design_system';
