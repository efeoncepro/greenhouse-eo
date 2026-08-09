-- Up Migration

-- TASK-1310 — El catálogo inicial `seo_v1` nació sin superficies cliente.
-- `modules.*` es append-only: cambiar view_codes in-place está prohibido por
-- `modules_append_only_check`. Por eso esta migración crea `seo_v2`, conserva
-- el entitlement per-org y supersede las asignaciones vigentes en la misma
-- transacción. Nunca convierte el acceso en un grant role-wide.

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('cliente.growth_seo_dashboard', 'cliente', 'SEO',
   'Dashboard SEO client-scoped (TASK-1310): lectura orgánica, evolución y Search Visibility 360. Solo datos propios.',
   'client', '/growth/seo', 'tabler-chart-arrows-vertical', 201, TRUE, 'migration:TASK-1310'),
  ('cliente.growth_seo_report', 'cliente', 'Informe SEO',
   'Informe SEO client-scoped (TASK-1310): render web e imprimible derivado del contrato compartido de reportes.',
   'client', '/growth/seo/report', 'tabler-file-analytics', 202, TRUE, 'migration:TASK-1310')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1310';

-- Estos códigos son module-gated. Persistir denials explícitos evita que el
-- fallback del route group los convierta en visibilidad por rol.
INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('client_executive',  'cliente.growth_seo_dashboard', FALSE, 'migration:TASK-1310', NOW(), NOW(), 'migration:TASK-1310'),
  ('client_manager',    'cliente.growth_seo_dashboard', FALSE, 'migration:TASK-1310', NOW(), NOW(), 'migration:TASK-1310'),
  ('client_specialist', 'cliente.growth_seo_dashboard', FALSE, 'migration:TASK-1310', NOW(), NOW(), 'migration:TASK-1310'),
  ('client_executive',  'cliente.growth_seo_report', FALSE, 'migration:TASK-1310', NOW(), NOW(), 'migration:TASK-1310'),
  ('client_manager',    'cliente.growth_seo_report', FALSE, 'migration:TASK-1310', NOW(), NOW(), 'migration:TASK-1310'),
  ('client_specialist', 'cliente.growth_seo_report', FALSE, 'migration:TASK-1310', NOW(), NOW(), 'migration:TASK-1310')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = FALSE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1310';

INSERT INTO greenhouse_client_portal.modules
  (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind)
VALUES
  ('seo_v2',
   'SEO (Search Visibility 360)',
   'SEO',
   'cross',
   'addon',
   ARRAY['cliente.growth_seo_dashboard', 'cliente.growth_seo_report'],
   ARRAY[]::TEXT[],
   ARRAY['growth.seo'],
   'addon_usage')
ON CONFLICT (module_key) DO NOTHING;

-- El catálogo y la asignación son time-versioned. Se preservan status, tier,
-- expiración y metadata; `source_ref_json` deja la cadena de supersede.
WITH active_v1 AS (
  SELECT *
  FROM greenhouse_client_portal.module_assignments
  WHERE module_key = 'seo_v1'
    AND effective_to IS NULL
  FOR UPDATE
), inserted_v2 AS (
  INSERT INTO greenhouse_client_portal.module_assignments
    (assignment_id, organization_id, module_key, status, source, source_ref_json,
     effective_from, expires_at, approved_by_user_id, approved_at, metadata_json, created_at, updated_at)
  SELECT
    assignment_id || ':seo_v2',
    organization_id,
    'seo_v2',
    status,
    'migration_backfill',
    jsonb_build_object(
      'task', 'TASK-1310',
      'supersedesAssignmentId', assignment_id,
      'supersedesModuleKey', 'seo_v1',
      'originalSource', source
    ),
    CURRENT_DATE,
    expires_at,
    approved_by_user_id,
    approved_at,
    metadata_json,
    NOW(),
    NOW()
  FROM active_v1
  ON CONFLICT (assignment_id) DO NOTHING
  RETURNING assignment_id
)
UPDATE greenhouse_client_portal.module_assignments legacy
SET effective_to = CASE
      WHEN legacy.effective_from >= CURRENT_DATE THEN CURRENT_DATE + 1
      ELSE CURRENT_DATE
    END,
    updated_at = NOW()
FROM active_v1
WHERE legacy.assignment_id = active_v1.assignment_id;

DO $$
DECLARE
  v2_module_count INTEGER;
  active_v1_count INTEGER;
  client_view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v2_module_count
  FROM greenhouse_client_portal.modules
  WHERE module_key = 'seo_v2'
    AND effective_to IS NULL
    AND view_codes @> ARRAY['cliente.growth_seo_dashboard', 'cliente.growth_seo_report'];

  IF v2_module_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1310: seo_v2 module with client view codes was not seeded';
  END IF;

  SELECT COUNT(*) INTO active_v1_count
  FROM greenhouse_client_portal.module_assignments
  WHERE module_key = 'seo_v1'
    AND effective_to IS NULL;

  IF active_v1_count <> 0 THEN
    RAISE EXCEPTION 'TASK-1310: active seo_v1 assignments remain after supersede';
  END IF;

  SELECT COUNT(*) INTO client_view_count
  FROM greenhouse_core.view_registry
  WHERE view_code IN ('cliente.growth_seo_dashboard', 'cliente.growth_seo_report')
    AND active = TRUE;

  IF client_view_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1310: expected 2 active SEO client view codes, got %', client_view_count;
  END IF;
END
$$;

-- Down Migration
-- Forward-only catalog and assignment history: do not delete or reactivate
-- records automatically. Rollback is an explicit supersede migration.
