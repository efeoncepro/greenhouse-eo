-- Up Migration

-- TASK-1709 — Capabilities del diagnóstico de prospecto (patrón canónico #6:
-- seed en capabilities_registry + catálogo TS + grant en runtime.ts, MISMO PR).
-- `run` compromete gasto real de adquisición → grant SOLO EFEONCE_ADMIN/EFEONCE_ACCOUNT;
-- `read` además EFEONCE_OPERATIONS (leer no gasta).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('growth.seo.prospect_diagnostic.run', 'growth', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1709 — Disparar un diagnóstico SEO de prospecto (una corrida, tope duro en USD, gasto de adquisición atribuido a Efeonce). Grant: EFEONCE_ADMIN + EFEONCE_ACCOUNT.', NOW(), NULL),
  ('growth.seo.prospect_diagnostic.read', 'growth', ARRAY['read'], ARRAY['tenant'],
   'TASK-1709 — Leer diagnósticos SEO de prospecto (hechos con lente estimada; jamás client-facing). Grant: EFEONCE_ADMIN + EFEONCE_ACCOUNT + EFEONCE_OPERATIONS.', NOW(), NULL)
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
   WHERE capability_key IN ('growth.seo.prospect_diagnostic.run', 'growth.seo.prospect_diagnostic.read')
     AND deprecated_at IS NULL;

  IF seeded_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1709 anti pre-up-marker check: prospect diagnostic capabilities NOT seeded (count=%). Markers may be inverted.', seeded_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN ('growth.seo.prospect_diagnostic.run', 'growth.seo.prospect_diagnostic.read')
  AND deprecated_at IS NULL;
