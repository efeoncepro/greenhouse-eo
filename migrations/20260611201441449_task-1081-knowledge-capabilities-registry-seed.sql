-- Up Migration
--
-- TASK-1081 — Knowledge Platform capabilities (5) sembradas en capabilities_registry.
-- Parity con ENTITLEMENT_CAPABILITY_CATALOG (src/config/entitlements-catalog.ts) +
-- grants en src/lib/entitlements/runtime.ts (mismo PR — invariant TASK-873/935).
-- Módulo `knowledge`, MVP solo interno. Aún no can()-checked (consumidores TASK-1083/1084).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'knowledge.document.read',
    'knowledge',
    ARRAY['read'],
    ARRAY['tenant'],
    'TASK-1081 — Leer documentos de conocimiento publicados (scoped por audience/sensitivity).',
    NOW(),
    NULL
  ),
  (
    'knowledge.document.publish',
    'knowledge',
    ARRAY['create', 'update'],
    ARRAY['tenant'],
    'TASK-1081 — Publicar/actualizar documentos de conocimiento (Notion -> Greenhouse).',
    NOW(),
    NULL
  ),
  (
    'knowledge.source.admin',
    'knowledge',
    ARRAY['manage'],
    ARRAY['all'],
    'TASK-1081 — Administrar el source registry de conocimiento. Admin only.',
    NOW(),
    NULL
  ),
  (
    'knowledge.agentic.retrieve',
    'knowledge',
    ARRAY['read'],
    ARRAY['all'],
    'TASK-1081 — Retrieval agéntico scoped (Nexa/MCP) sobre el corpus publicado.',
    NOW(),
    NULL
  ),
  (
    'knowledge.feedback.submit',
    'knowledge',
    ARRAY['create'],
    ARRAY['tenant'],
    'TASK-1081 — Enviar feedback humano sobre un documento/respuesta de conocimiento.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL,
  introduced_at = COALESCE(greenhouse_core.capabilities_registry.introduced_at, NOW());

-- Anti pre-up-marker guard.
DO $$
DECLARE
  registered_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'knowledge.document.read',
    'knowledge.document.publish',
    'knowledge.source.admin',
    'knowledge.agentic.retrieve',
    'knowledge.feedback.submit'
  )
    AND deprecated_at IS NULL;

  IF registered_count <> 5 THEN
    RAISE EXCEPTION 'TASK-1081: expected 5 active knowledge.* capabilities, got %', registered_count;
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key IN (
  'knowledge.document.read',
  'knowledge.document.publish',
  'knowledge.source.admin',
  'knowledge.agentic.retrieve',
  'knowledge.feedback.submit'
)
  AND deprecated_at IS NULL;
