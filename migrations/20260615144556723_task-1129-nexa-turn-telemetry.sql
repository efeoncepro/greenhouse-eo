-- Up Migration

-- TASK-1129 — Ledger aditivo de telemetría de turno de Nexa.
-- Una fila por respuesta de Nexa (assistant turn): qué versión de prompt + provider + modelo +
-- outcome + latencias + tools la produjeron. Observabilidad, NO contenido de conversación:
-- NUNCA guarda el prompt completo, el texto de respuesta, los tool results crudos ni secretos.
-- Append-only en la práctica (write-once por turno); cascada al borrar el mensaje/hilo.

CREATE TABLE IF NOT EXISTS greenhouse_ai.nexa_turn_telemetry (
  telemetry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL REFERENCES greenhouse_ai.nexa_messages (message_id) ON DELETE CASCADE,
  thread_id uuid NOT NULL,
  user_id text NOT NULL,
  client_id text,
  -- Governance del prompt (TASK-1124): qué runtime produjo la respuesta.
  prompt_version text NOT NULL,
  prompt_family text NOT NULL,
  -- Provider plan + resolución (TASK-1091 / TASK-1134).
  primary_provider text NOT NULL,
  resolved_provider text,
  resolved_model text,
  provider_step_count integer NOT NULL DEFAULT 1,
  did_failover boolean NOT NULL DEFAULT false,
  failover_from text,
  -- Outcome del turno.
  outcome text NOT NULL,
  total_latency_ms integer NOT NULL DEFAULT 0,
  -- Tools usados (nombres + cuántos); availability + per-step latency viven en detail.
  tools_used text[] NOT NULL DEFAULT '{}',
  tool_count integer NOT NULL DEFAULT 0,
  -- Sugerencias de seguimiento.
  suggestion_count integer NOT NULL DEFAULT 0,
  suggestion_outcome text,
  -- Contrato versionado (tokens/costo = null hasta que el SDK exponga usage estable).
  contract_version text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT nexa_turn_telemetry_outcome_check
    CHECK (outcome IN ('success', 'graceful_fallback', 'tool_degraded', 'provider_failed', 'aborted')),
  CONSTRAINT nexa_turn_telemetry_suggestion_outcome_check
    CHECK (suggestion_outcome IS NULL OR suggestion_outcome IN ('generated', 'empty', 'failed'))
);

-- Índices para la reliability signal + filtrado de regresiones por prompt/provider/outcome.
CREATE INDEX IF NOT EXISTS nexa_turn_telemetry_outcome_created_idx
  ON greenhouse_ai.nexa_turn_telemetry (outcome, created_at DESC);
CREATE INDEX IF NOT EXISTS nexa_turn_telemetry_prompt_version_created_idx
  ON greenhouse_ai.nexa_turn_telemetry (prompt_version, created_at DESC);
CREATE INDEX IF NOT EXISTS nexa_turn_telemetry_resolved_provider_created_idx
  ON greenhouse_ai.nexa_turn_telemetry (resolved_provider, created_at DESC);
CREATE INDEX IF NOT EXISTS nexa_turn_telemetry_message_idx
  ON greenhouse_ai.nexa_turn_telemetry (message_id);

ALTER TABLE greenhouse_ai.nexa_turn_telemetry OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_ai.nexa_turn_telemetry TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_ai.nexa_turn_telemetry TO greenhouse_migrator;

-- Anti pre-up-marker guard: abortar si la tabla no quedó creada (markers invertidos).
DO $$
BEGIN
  IF to_regclass('greenhouse_ai.nexa_turn_telemetry') IS NULL THEN
    RAISE EXCEPTION 'TASK-1129: greenhouse_ai.nexa_turn_telemetry was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_ai.nexa_turn_telemetry;
