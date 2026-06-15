-- Up Migration

-- TASK-655 — API Platform Command & Idempotency Foundation.
-- Tabla única que sirve DOS propósitos a la vez (SSOT, no dos tablas que se desincronizan):
--   1) Command audit trail: toda ejecución de un command de API Platform = 1 fila.
--   2) Idempotency store: las ejecuciones con `Idempotency-Key` comparten una fila por
--      (principal_id, idempotency_key) y se resuelven con semántica replay/conflict/in-progress.
-- Lane-agnostic por diseño (principal_kind + principal_id): hoy la adopta el event control plane
-- (lane ecosystem, principal = sister platform consumer); app/internal quedan como follow-up.
-- Patrón fuente: greenhouse_finance.idempotency_keys (claim INSERT ON CONFLICT) + el state machine
-- processing|completed|failed. Diferencia canónica vs el legacy finance: detecta payload-mismatch
-- (request_fingerprint) → idempotency_conflict (spec API Platform §12.3).

CREATE TABLE IF NOT EXISTS greenhouse_core.api_platform_command_executions (
  command_execution_id   TEXT PRIMARY KEY,
  lane                   TEXT NOT NULL,
  principal_kind         TEXT NOT NULL,
  principal_id           TEXT NOT NULL,
  consumer_id            TEXT,
  app_session_id         TEXT,
  user_id                TEXT,
  route_key              TEXT NOT NULL,
  request_method         TEXT NOT NULL,
  request_path           TEXT NOT NULL,
  idempotency_key        TEXT,
  request_fingerprint    TEXT,
  status                 TEXT NOT NULL DEFAULT 'processing',
  response_status        INTEGER,
  response_body          JSONB,
  error_code             TEXT,
  replay_count           INTEGER NOT NULL DEFAULT 0,
  greenhouse_scope_type  TEXT,
  organization_id        TEXT,
  client_id              TEXT,
  space_id               TEXT,
  expires_at             TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at           TIMESTAMPTZ,
  CONSTRAINT api_platform_command_executions_status_check
    CHECK (status IN ('processing', 'completed', 'failed')),
  CONSTRAINT api_platform_command_executions_lane_check
    CHECK (lane IN ('ecosystem', 'app', 'internal')),
  CONSTRAINT api_platform_command_executions_principal_kind_check
    CHECK (principal_kind IN ('consumer', 'app_user', 'internal_actor')),
  -- Si hay idempotency_key, DEBE haber fingerprint: sin él no se puede detectar reuse con
  -- payload distinto (idempotency_conflict). El audit puro (sin key) no requiere fingerprint.
  CONSTRAINT api_platform_command_executions_key_requires_fingerprint_check
    CHECK (idempotency_key IS NULL OR request_fingerprint IS NOT NULL)
);

-- Una key es propiedad de su principal: claim atómico vía INSERT ... ON CONFLICT.
-- Parcial WHERE NOT NULL → las ejecuciones sin key (audit puro) nunca colisionan.
CREATE UNIQUE INDEX IF NOT EXISTS api_platform_command_executions_idem_uq
  ON greenhouse_core.api_platform_command_executions (principal_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Forensic por command type.
CREATE INDEX IF NOT EXISTS api_platform_command_executions_route_created_idx
  ON greenhouse_core.api_platform_command_executions (route_key, created_at DESC);

-- Detección de keys atascadas (command crasheó sin marcar failed) + barrido de expiración.
CREATE INDEX IF NOT EXISTS api_platform_command_executions_processing_idx
  ON greenhouse_core.api_platform_command_executions (expires_at)
  WHERE status = 'processing';

ALTER TABLE greenhouse_core.api_platform_command_executions OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.api_platform_command_executions TO greenhouse_runtime;

COMMENT ON TABLE greenhouse_core.api_platform_command_executions IS
  'TASK-655 — API Platform command audit trail + idempotency store. Una fila por ejecución de command; las idempotentes comparten (principal_id, idempotency_key). State machine processing|completed|failed.';

-- Anti pre-up-marker guard: aborta si la tabla no quedó realmente creada (clase ISSUE-068).
DO $$
DECLARE
  table_exists boolean;
  idem_index_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'api_platform_command_executions'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-655 anti pre-up-marker: greenhouse_core.api_platform_command_executions was NOT created. Migration markers may be inverted.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_core'
      AND indexname = 'api_platform_command_executions_idem_uq'
  ) INTO idem_index_exists;

  IF NOT idem_index_exists THEN
    RAISE EXCEPTION 'TASK-655 anti pre-up-marker: partial unique idempotency index was NOT created.';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.api_platform_command_executions;
