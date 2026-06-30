-- Up Migration

-- TASK-1226 Slice 1 — Capabilities del dominio Growth AI Visibility Grader.
-- run.execute: correr el grader/smoke interno (governed action runtime).
-- observation.read: leer runs/observations del evidence ledger.
-- Grant (runtime.ts, mismo PR): route_group internal ∪ EFEONCE_ADMIN ∪ AI_TOOLING_ADMIN.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.ai_visibility.run.execute',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1226 — Correr el AI Visibility Grader (smoke/eval/internal_audit) contra answer engines. Governed; writes de negocio futuros via propose->confirm->execute. Grant: internal + EFEONCE_ADMIN + AI_TOOLING_ADMIN.',
    NOW(),
    NULL
  ),
  (
    'growth.ai_visibility.observation.read',
    'growth',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1226 — Leer runs/observations normalizadas del AI Visibility Grader (evidence ledger). Grant: internal + EFEONCE_ADMIN + AI_TOOLING_ADMIN.',
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
  WHERE capability_key IN ('growth.ai_visibility.run.execute', 'growth.ai_visibility.observation.read')
    AND deprecated_at IS NULL;

  IF seeded_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1226 anti pre-up-marker check: growth.ai_visibility capabilities NOT seeded (count=%). Migration markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('growth.ai_visibility.run.execute', 'growth.ai_visibility.observation.read')
  AND deprecated_at IS NULL;
