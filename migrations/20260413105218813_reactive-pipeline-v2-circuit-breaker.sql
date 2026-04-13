-- Up Migration
--
-- TASK-379 Slice 1 — Reactive pipeline V2 hardening.
-- Adds the projection_circuit_state table that the new consumer uses to
-- track per-projection failure rates and quarantine chronically-failing
-- projections without blocking the rest of the batch.
--
-- Backwards compatible: the existing consumer V1 ignores this table
-- entirely, so this migration is safe to ship before the consumer
-- refactor lands.

SET search_path = greenhouse_sync, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_sync.projection_circuit_state (
  projection_name        TEXT PRIMARY KEY,
  state                  TEXT NOT NULL DEFAULT 'closed'
                          CHECK (state IN ('closed', 'open', 'half_open')),
  consecutive_failures   INTEGER NOT NULL DEFAULT 0,
  total_runs_window      INTEGER NOT NULL DEFAULT 0,
  failed_runs_window     INTEGER NOT NULL DEFAULT 0,
  window_started_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  opened_at              TIMESTAMPTZ,
  half_open_probe_at     TIMESTAMPTZ,
  last_error             TEXT,
  last_failure_at        TIMESTAMPTZ,
  last_success_at        TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE greenhouse_sync.projection_circuit_state IS
  'Per-projection circuit breaker state for the V2 reactive consumer (TASK-379). '
  'closed: normal processing. open: temporarily quarantined after threshold breach. '
  'half_open: probing one event to decide whether to recover. '
  'Window counters reset every time the breaker transitions to closed.';

COMMENT ON COLUMN greenhouse_sync.projection_circuit_state.consecutive_failures IS
  'Streak of failures since the last success. Resets on first success.';

COMMENT ON COLUMN greenhouse_sync.projection_circuit_state.total_runs_window IS
  'Total runs counted in the current rolling failure-rate window.';

COMMENT ON COLUMN greenhouse_sync.projection_circuit_state.failed_runs_window IS
  'Failed runs counted in the current rolling failure-rate window.';

CREATE INDEX IF NOT EXISTS projection_circuit_state_open_idx
  ON greenhouse_sync.projection_circuit_state (state, opened_at)
  WHERE state IN ('open', 'half_open');

ALTER TABLE greenhouse_sync.projection_circuit_state
  OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_sync.projection_circuit_state
  TO greenhouse_runtime;

-- Down Migration

SET search_path = greenhouse_sync, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_sync.projection_circuit_state_open_idx;
DROP TABLE IF EXISTS greenhouse_sync.projection_circuit_state;
