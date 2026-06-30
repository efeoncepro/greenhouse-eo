-- Up Migration

-- TASK-1248 — Seed canonical del viewCode `cliente.ai_visibility_report` (Portal cliente · AI Visibility)
-- en `greenhouse_core.view_registry` + grants en `role_view_assignments` para los 3 client roles +
-- efeonce_admin (visibilidad internal de soporte). Acompaña la entry agregada al VIEW_REGISTRY TS
-- (`src/lib/admin/view-access-catalog.ts`) en el mismo PR — sin este seed, cada sesión cliente dispara
-- el telemetry warning `role_view_fallback_used` (Sentry domain=identity). Pattern fuente: TASK-827.
-- Idempotente: re-runs preservan admin-edited rows vía ON CONFLICT DO UPDATE.

-- 1. Register el viewCode en view_registry
INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('cliente.ai_visibility_report',
   'cliente',
   'Visibilidad en IA',
   'Informe AI Visibility client-scoped (TASK-1248): puntaje, dimensiones, recomendaciones y tendencia. Deep-link, sin evidencia cruda.',
   'client',
   '/growth/ai-visibility/report',
   'tabler-robot',
   200,
   TRUE,
   'migration:TASK-1248')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1248';

-- 2. Grants: 3 client roles + efeonce_admin (soporte/visibilidad internal)
INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('client_executive',  'cliente.ai_visibility_report', true, 'migration:TASK-1248', NOW(), NOW(), 'migration:TASK-1248'),
  ('client_manager',    'cliente.ai_visibility_report', true, 'migration:TASK-1248', NOW(), NOW(), 'migration:TASK-1248'),
  ('client_specialist', 'cliente.ai_visibility_report', true, 'migration:TASK-1248', NOW(), NOW(), 'migration:TASK-1248'),
  ('efeonce_admin',     'cliente.ai_visibility_report', true, 'migration:TASK-1248', NOW(), NOW(), 'migration:TASK-1248')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1248';

-- 3. Anti pre-up-marker guard: aborta si el seed no quedó realmente aplicado.
DO $$
DECLARE
  registered_count INTEGER;
  granted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.view_registry
  WHERE view_code = 'cliente.ai_visibility_report' AND active = TRUE;

  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1248 anti pre-up-marker check: expected 1 view_registry row, got %', registered_count;
  END IF;

  SELECT COUNT(*) INTO granted_count
  FROM greenhouse_core.role_view_assignments
  WHERE view_code = 'cliente.ai_visibility_report'
    AND updated_by = 'migration:TASK-1248'
    AND granted = TRUE;

  IF granted_count < 4 THEN
    RAISE EXCEPTION 'TASK-1248 anti pre-up-marker check: expected 4 role_view_assignments rows, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.role_view_assignments WHERE view_code = 'cliente.ai_visibility_report';
DELETE FROM greenhouse_core.view_registry WHERE view_code = 'cliente.ai_visibility_report';