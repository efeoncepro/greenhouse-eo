-- Up Migration

-- TASK-1277 Slice 1 — AEO pasa de "viewCode prendido role-wide" (error de plano de
-- TASK-1248) a **módulo per-org** (`ai_visibility_v1` en greenhouse_client_portal.modules).
-- Cutover ATÓMICO en una sola migración para no dejar AEO ni doble-expuesto ni inaccesible:
--   1. Seed del módulo `ai_visibility_v1` (view_codes = ['cliente.ai_visibility_report']).
--   2. Revert de los 3 grants role-wide de `cliente.ai_visibility_report` en role_view_assignments
--      (client_executive / client_manager / client_specialist). efeonce_admin se MANTIENE
--      (visibilidad internal de soporte). El viewCode SIGUE registrado en view_registry.
--   3. Provisión de Grupo Berel = `active` (tier contratado) en el MISMO release que el revert.
-- El acceso queda gateado por `module_assignments` per-org (defense in depth: capability fina
-- `growth.ai_visibility.report.read_client` + módulo asignado). El tier (contracted/trial/pilot)
-- vive en `module_assignments.metadata_json.aeo_tier`.

SET search_path TO public, greenhouse_core, greenhouse_client_portal;

-- 1. Seed del módulo AEO. tier=addon (servicio per-org), pricing_kind=addon_usage (metered:
--    trial N/mes + contratado por cadencia/contrato). capabilities=[] a propósito: la page
--    autoriza con la capability growth `report.read_client` + el módulo asignado, NO via
--    hasCapabilityViaModule. data_sources declara el dominio productor `growth.ai_visibility`
--    (agregado al TS union ClientPortalDataSource en el mismo PR — parity DB ⊆ TS).
INSERT INTO greenhouse_client_portal.modules
  (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind)
VALUES
  ('ai_visibility_v1',
   'AI Visibility (AEO)',
   'AEO',
   'cross',
   'addon',
   ARRAY['cliente.ai_visibility_report'],
   ARRAY[]::TEXT[],
   ARRAY['growth.ai_visibility'],
   'addon_usage')
ON CONFLICT (module_key) DO NOTHING;

-- 2. Revert del grant role-wide de TASK-1248: borra SOLO los 3 client roles.
--    efeonce_admin queda intacto. El fallback hardcoded NO grantea este viewCode a client
--    roles (verificado: ai_visibility_report sólo aparece como metadata en VIEW_REGISTRY TS),
--    por lo que el DELETE basta para denegar role-wide; el acceso real lo da el módulo.
DELETE FROM greenhouse_core.role_view_assignments
WHERE view_code = 'cliente.ai_visibility_report'
  AND role_code IN ('client_executive', 'client_manager', 'client_specialist');

-- 3. Provisión de Grupo Berel = active (tier contratado), en el mismo release que el revert.
--    Idempotente: NOT EXISTS contra el assignment activo (unique parcial por org+module
--    WHERE effective_to IS NULL).
INSERT INTO greenhouse_client_portal.module_assignments
  (assignment_id, organization_id, module_key, status, source, source_ref_json,
   effective_from, metadata_json, created_at, updated_at)
SELECT
  'cpma-task1277-berel-ai-visibility',
  'org-32333527-02a8-487b-819e-6f76a761777d',
  'ai_visibility_v1',
  'active',
  'manual_admin',
  jsonb_build_object('task', 'TASK-1277', 'note', 'Grupo Berel — AEO contratado'),
  CURRENT_DATE,
  jsonb_build_object('aeo_tier', 'contracted'),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM greenhouse_client_portal.module_assignments
  WHERE organization_id = 'org-32333527-02a8-487b-819e-6f76a761777d'
    AND module_key = 'ai_visibility_v1'
    AND effective_to IS NULL
);

-- 4. Anti pre-up-marker guard: aborta si el cutover no quedó realmente aplicado.
DO $$
DECLARE
  module_count INTEGER;
  leftover_client_grants INTEGER;
  berel_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO module_count
  FROM greenhouse_client_portal.modules
  WHERE module_key = 'ai_visibility_v1';
  IF module_count < 1 THEN
    RAISE EXCEPTION 'TASK-1277 anti pre-up-marker check: module ai_visibility_v1 was NOT created';
  END IF;

  SELECT COUNT(*) INTO leftover_client_grants
  FROM greenhouse_core.role_view_assignments
  WHERE view_code = 'cliente.ai_visibility_report'
    AND role_code IN ('client_executive', 'client_manager', 'client_specialist')
    AND granted = TRUE;
  IF leftover_client_grants > 0 THEN
    RAISE EXCEPTION 'TASK-1277 anti pre-up-marker check: % client role grants still present (revert failed)', leftover_client_grants;
  END IF;

  SELECT COUNT(*) INTO berel_count
  FROM greenhouse_client_portal.module_assignments
  WHERE organization_id = 'org-32333527-02a8-487b-819e-6f76a761777d'
    AND module_key = 'ai_visibility_v1'
    AND effective_to IS NULL
    AND status = 'active';
  IF berel_count < 1 THEN
    RAISE EXCEPTION 'TASK-1277 anti pre-up-marker check: Grupo Berel active assignment missing';
  END IF;
END
$$;

-- Down Migration

-- Reverse del cutover: re-aplica el grant role-wide de TASK-1248 (3 client roles), retira la
-- asignación de Berel y borra el módulo. Vuelve al estado pre-1277 (AEO role-wide).
SET search_path TO public, greenhouse_core, greenhouse_client_portal;

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('client_executive',  'cliente.ai_visibility_report', true, 'migration:TASK-1277-down', NOW(), NOW(), 'migration:TASK-1277-down'),
  ('client_manager',    'cliente.ai_visibility_report', true, 'migration:TASK-1277-down', NOW(), NOW(), 'migration:TASK-1277-down'),
  ('client_specialist', 'cliente.ai_visibility_report', true, 'migration:TASK-1277-down', NOW(), NOW(), 'migration:TASK-1277-down')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-1277-down';

DELETE FROM greenhouse_client_portal.module_assignments
WHERE module_key = 'ai_visibility_v1';

DELETE FROM greenhouse_client_portal.modules
WHERE module_key = 'ai_visibility_v1';