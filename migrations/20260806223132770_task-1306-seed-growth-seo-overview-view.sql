-- Up Migration

-- TASK-1306 — Seed del viewCode canónico `administracion.growth_seo` para el cockpit
-- Overview del módulo SEO (Search Visibility 360) en /admin/growth/seo, y casa de la
-- sección local "Search Visibility" (tabs Overview·Rendimiento·Keywords·Auditoría).
--
-- El viewCode se siembra EXACTAMENTE a los roles que ya poseen la capability fina
-- `growth.seo.observation.read` (TASK-1301, src/lib/entitlements/runtime.ts): efeonce_admin
-- + ai_tooling_admin. El route_group `internal` entra por el fallback del guard.
-- Sembrarlo a un rol SIN la capability daría un ítem de menú visible que redirige a /401
-- al entrar — surface sin autoridad, incoherencia de acceso.
--
-- NUNCA client_* : el acceso cliente al módulo SEO va por `growth.seo.report.read_client`
-- con scope 'own' y su propia surface, no por este cockpit interno.
--
-- El acceso a una ORGANIZACIÓN concreta lo sigue gobernando el chokepoint per-org
-- (`module_assignments` = `seo_v1`, TASK-1301): este viewCode es el plano de superficie.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('administracion.growth_seo',
   'administracion',
   'SEO',
   'Cockpit de salud SEO por Space: KPIs medidos de Search Console, evolución de visibilidad, salud del sitio y movers.',
   'admin',
   '/admin/growth/seo',
   'tabler-chart-arrows-vertical',
   46,
   TRUE,
   'migration:TASK-1306')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1306';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin',    'administracion.growth_seo', true, 'migration:TASK-1306', NOW(), NOW(), 'migration:TASK-1306'),
  ('ai_tooling_admin', 'administracion.growth_seo', true, 'migration:TASK-1306', NOW(), NOW(), 'migration:TASK-1306')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1306';

DO $$
DECLARE registered_count integer; granted_count integer;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
    WHERE view_code = 'administracion.growth_seo' AND active = TRUE;
  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-1306 anti pre-up-marker: administracion.growth_seo NOT in view_registry';
  END IF;

  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
    WHERE view_code = 'administracion.growth_seo' AND granted = TRUE;
  IF granted_count < 2 THEN
    RAISE EXCEPTION 'TASK-1306 anti pre-up-marker: expected >=2 role grants, got %', granted_count;
  END IF;
END
$$;

-- Down Migration

-- Append-only: NUNCA se borran filas de role_view_assignments (TASK-827) — se desactivan.

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1306:revert'
WHERE view_code = 'administracion.growth_seo';

UPDATE greenhouse_core.view_registry
SET active = FALSE, updated_at = NOW(), updated_by = 'migration:TASK-1306:revert'
WHERE view_code = 'administracion.growth_seo';
