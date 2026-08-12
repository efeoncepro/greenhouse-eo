-- Up Migration

-- ISSUE-151 — `administracion.globe_credits` was added to the TypeScript registry
-- by TASK-1483 without its persisted governance rows. Keep the internal fallback
-- and its Sentry signal intact; the durable correction is the explicit seed.
--
-- The workbench contract grants this administrative surface only to `efeonce_admin`.
-- Granting any other role here would expose a navigation surface without the
-- corresponding Globe credit-funding capability.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('administracion.globe_credits',
   'administracion',
   'Créditos Globe',
   'Capacidad efectiva, operaciones de fondeo y recuperación de Globe.',
   'admin',
   '/admin/globe/credits',
   'tabler-credit-card',
   47,
   TRUE,
   'migration:ISSUE-151')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:ISSUE-151';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin', 'administracion.globe_credits', TRUE, 'migration:ISSUE-151', NOW(), NOW(), 'migration:ISSUE-151')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:ISSUE-151';

DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count
    FROM greenhouse_core.view_registry
   WHERE view_code = 'administracion.globe_credits'
     AND active = TRUE;
  IF registered_count <> 1 THEN
    RAISE EXCEPTION 'ISSUE-151 anti pre-up-marker: expected one active view_registry row, got %', registered_count;
  END IF;

  SELECT COUNT(*) INTO granted_count
    FROM greenhouse_core.role_view_assignments
   WHERE role_code = 'efeonce_admin'
     AND view_code = 'administracion.globe_credits'
     AND granted = TRUE;
  IF granted_count <> 1 THEN
    RAISE EXCEPTION 'ISSUE-151 anti pre-up-marker: expected one efeonce_admin grant, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

-- Preserve the governance audit trail: a reversal explicitly revokes instead
-- of deleting the assignment row.
UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE,
    updated_at = NOW(),
    updated_by = 'migration:ISSUE-151:revert'
WHERE role_code = 'efeonce_admin'
  AND view_code = 'administracion.globe_credits';

UPDATE greenhouse_core.view_registry
SET active = FALSE,
    updated_at = NOW(),
    updated_by = 'migration:ISSUE-151:revert'
WHERE view_code = 'administracion.globe_credits';
