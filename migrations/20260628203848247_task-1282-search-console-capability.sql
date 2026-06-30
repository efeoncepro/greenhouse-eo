-- Up Migration
--
-- TASK-1282 — Seed de la capability `growth.search_console.connect` en el registry
-- declarativo (greenhouse_core.capabilities_registry). El TS catalog
-- (entitlements-catalog.ts) es la SSOT runtime; este registry es su reflexión y la
-- parity test (capabilities-registry/parity.test.ts) falla ante drift. Acción canónica
-- `execute` (verbo de gobernanza: connect/disconnect son commands; el LLM nunca conecta
-- directo). Grant a roles en runtime.ts (mismo PR).

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'growth.search_console.connect',
    'growth',
    ARRAY['execute'],
    ARRAY['tenant'],
    'TASK-1282 — Conectar/desconectar la propiedad Google Search Console de una organización cliente (OAuth 3-legged, token per-org). Command gobernado: el LLM nunca conecta directo.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker: aborta si la fila no quedó activa.
DO $$
DECLARE seeded boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.capabilities_registry
     WHERE capability_key = 'growth.search_console.connect' AND deprecated_at IS NULL
  ) INTO seeded;

  IF NOT seeded THEN
    RAISE EXCEPTION 'TASK-1282 anti pre-up-marker: capability growth.search_console.connect NO seedeada.';
  END IF;
END
$$;

-- Down Migration

UPDATE greenhouse_core.capabilities_registry
   SET deprecated_at = NOW()
 WHERE capability_key = 'growth.search_console.connect';
