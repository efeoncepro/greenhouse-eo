-- Up Migration

-- TASK-1137 — Nexa governed action runtime.
-- Dos cosas en una migración:
--   1) Seed de la capability `nexa.action.execute` en capabilities_registry (invariant TASK-873/935:
--      toda capability nueva del catálogo TS se seedea en el registry mismo PR; el parity test rompe
--      el build si divergen).
--   2) Ledger append-only `greenhouse_ai.nexa_action_events`: una fila por evento del ciclo de vida de
--      una acción gobernada (proposed / proposal_denied / executed / failed / execution_denied /
--      conflict / cancelled). Observabilidad + seguridad, NO contenido de conversación: NUNCA guarda
--      el prompt, la respuesta ni datos crudos del dominio — solo qué acción, qué evento y por qué.

-- 1. Capability seed -----------------------------------------------------------
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'nexa.action.execute',
    'home',
    ARRAY['execute'],
    ARRAY['own'],
    'TASK-1137 — Confirmar/ejecutar una acción gobernada propuesta por Nexa (el LLM nunca ejecuta; el humano confirma vía endpoint determinístico + idempotency foundation).',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- 2. Action events ledger ------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_ai.nexa_action_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action_key text NOT NULL,
  event_type text NOT NULL,
  -- Razón del gap/denegación (gap reason del resolver, o motivo de denial). NULL en eventos OK.
  reason text,
  sensitivity text,
  idempotency_key text,
  replayed boolean NOT NULL DEFAULT false,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT nexa_action_events_event_type_check
    CHECK (event_type IN ('proposed', 'proposal_denied', 'executed', 'failed', 'execution_denied', 'conflict', 'cancelled')),
  CONSTRAINT nexa_action_events_sensitivity_check
    CHECK (sensitivity IS NULL OR sensitivity IN ('low', 'medium', 'high'))
);

-- Índices para las reliability signals (failure rate + unauthorized proposal rate) + drilldown.
CREATE INDEX IF NOT EXISTS nexa_action_events_type_created_idx
  ON greenhouse_ai.nexa_action_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS nexa_action_events_action_created_idx
  ON greenhouse_ai.nexa_action_events (action_key, created_at DESC);
CREATE INDEX IF NOT EXISTS nexa_action_events_user_created_idx
  ON greenhouse_ai.nexa_action_events (user_id, created_at DESC);

ALTER TABLE greenhouse_ai.nexa_action_events OWNER TO greenhouse_ops;
GRANT SELECT, INSERT ON greenhouse_ai.nexa_action_events TO greenhouse_runtime;

COMMENT ON TABLE greenhouse_ai.nexa_action_events IS
  'TASK-1137 — Ledger append-only del ciclo de vida de acciones gobernadas de Nexa. Observabilidad + seguridad (unauthorized proposal rate, action failure rate). NUNCA contenido de conversación.';

-- Anti pre-up-marker guard: aborta si la tabla o la capability no quedaron creadas (clase ISSUE-068).
DO $$
DECLARE
  table_exists boolean;
  capability_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_ai' AND table_name = 'nexa_action_events'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-1137 anti pre-up-marker: greenhouse_ai.nexa_action_events was NOT created. Markers may be inverted.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'nexa.action.execute' AND deprecated_at IS NULL
  ) INTO capability_exists;

  IF NOT capability_exists THEN
    RAISE EXCEPTION 'TASK-1137 anti pre-up-marker: capability nexa.action.execute was NOT seeded.';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_ai.nexa_action_events;

UPDATE greenhouse_core.capabilities_registry
SET deprecated_at = NOW()
WHERE capability_key = 'nexa.action.execute';
