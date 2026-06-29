-- Up Migration

-- TASK-1287 — Capability de lectura del reporte AEO para operadores internos (parity con
-- entitlements-catalog.ts). report.read_operator: leer el reporte AEO (narrativa + recomendaciones,
-- shape ClientGraderReport leak-safe) de cualquier cliente/prospecto (detalle operador) y el
-- agregado cross-org (cockpit). NO incluye evidencia cruda de provider. Distinta de report.read
-- (cliente, scope por su propio tenant): el operador lee una org ARBITRARIA y el reader self-guarda
-- con can(). Grant (runtime.ts): internal ∪ EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT ∪ EFEONCE_OPERATIONS ∪
-- AI_TOOLING_ADMIN (mismo set operador que run.operator).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.ai_visibility.report.read_operator',
    'growth',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1287 — Leer el reporte AEO (narrativa + recomendaciones, leak-safe) de cualquier cliente o prospecto y el agregado cross-org del cockpit, para operadores internos (Growth/AM). NO incluye evidencia cruda de provider. Grant: internal + EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS + AI_TOOLING_ADMIN.',
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
  WHERE capability_key = 'growth.ai_visibility.report.read_operator'
    AND deprecated_at IS NULL;

  IF seeded_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1287 anti pre-up-marker check: report.read_operator capability NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'growth.ai_visibility.report.read_operator'
  AND deprecated_at IS NULL;