-- Up Migration

-- TASK-1301 — Capabilities del módulo Growth SEO (EPIC-022 "Search Visibility 360").
-- 5 capabilities gobernadas (parity con entitlements-catalog.ts, mismo PR). El ACCESO
-- efectivo es per-org vía greenhouse_client_portal.module_assignments (module_key
-- 'seo_v1', lección TASK-1248); el gate de costo DataForSEO vive en el chokepoint
-- único enforceSeoRunEntitlement. Grants (runtime.ts, mismo PR):
--   target.configure / audit.run  → set operador (internal ∪ EFEONCE_ADMIN ∪
--     EFEONCE_ACCOUNT ∪ EFEONCE_OPERATIONS ∪ AI_TOOLING_ADMIN).
--   observation.read              → set interno base (internal ∪ EFEONCE_ADMIN ∪ AI_TOOLING_ADMIN).
--   entitlement.manage            → SOLO EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT (espejo AEO TASK-1286).
--   report.read_client            → client_* scope own (+ réplica superset interno, coverage).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.seo.target.configure',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1301 — Configurar targets SEO de una org (root_domain/keywords/competitors). Command gobernado; el gasto lo gatea enforceSeoRunEntitlement. Grant: set operador growth.',
    NOW(),
    NULL
  ),
  (
    'growth.seo.audit.run',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1301 — Disparar un site audit SEO (OnPage async, costo provider). Governed: chokepoint per-org (module seo_v1 -> allowance -> budget) antes de gastar. Grant: set operador growth.',
    NOW(),
    NULL
  ),
  (
    'growth.seo.observation.read',
    'growth',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1301 — Leer rank/backlink/audit snapshots del módulo SEO (contratado/operador). Reader canónico consumer-agnóstico (UI/Nexa/lane app/lane ecosystem — MCP-first). Grant: set interno base growth.',
    NOW(),
    NULL
  ),
  (
    'growth.seo.report.read_client',
    'growth',
    ARRAY['read'],
    ARRAY['own'],
    'TASK-1301 — El cliente ve el report SEO de SU organización (org derivada server-side, scope own). Grant: client_executive/client_manager/client_specialist + réplica superset interno (cobertura).',
    NOW(),
    NULL
  ),
  (
    'growth.seo.entitlement.manage',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1301 — Asignar/cambiar/revocar el módulo seo_v1 per-org (module_assignments). Espejo del entitlement.manage AEO: SOLO EFEONCE_ADMIN + EFEONCE_ACCOUNT.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el seed no quedó aplicado.
DO $$
DECLARE seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'growth.seo.target.configure',
    'growth.seo.audit.run',
    'growth.seo.observation.read',
    'growth.seo.report.read_client',
    'growth.seo.entitlement.manage'
  )
    AND deprecated_at IS NULL;

  IF seeded_count <> 5 THEN
    RAISE EXCEPTION 'TASK-1301 anti pre-up-marker check: SEO capabilities NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'growth.seo.target.configure',
  'growth.seo.audit.run',
  'growth.seo.observation.read',
  'growth.seo.report.read_client',
  'growth.seo.entitlement.manage'
)
  AND deprecated_at IS NULL;
