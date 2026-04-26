-- Up Migration

-- 2026-04-26 — Canonical handler health state.
--
-- Problem: Admin Center "X handlers degradados" KPI was reading row counts
-- from `outbox_reactive_log` (an audit log). A single broken handler that
-- retried 4 193 times appeared as "4 193 handlers degraded" — the dashboard
-- conflated "rows in retry log" with "handlers currently broken". 7 522
-- displayed for 12 distinct handlers, only some of them still failing.
--
-- Canonical fix: invert the direction. The audit log is the trail; the
-- authoritative state is `handler_health` (one row per handler). The
-- reactive worker UPSERTs this table on every invocation. KPIs read from
-- the state table, not from the log.
--
-- Same pattern applied to webhook deliveries via `webhook_endpoint_health`
-- (one row per endpoint), so the dashboard stops counting individual
-- delivery attempts and starts counting endpoints in a degraded state.
--
-- Acknowledgment columns make recovery first-class: an operator marks a
-- dead-letter resolved → the row leaves the KPI but stays in the audit
-- trail for forensics.
--
-- Spec: GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md (handler health
-- section to be added).

-- ── Table 1: handler_health ───────────────────────────────────────────────
-- One row per reactive handler. UPSERTed by the reactive worker.

CREATE TABLE IF NOT EXISTS greenhouse_sync.handler_health (
  handler                    TEXT PRIMARY KEY,
  current_state              TEXT NOT NULL DEFAULT 'healthy'
                               CHECK (current_state IN ('healthy', 'degraded', 'failed', 'quarantined')),
  consecutive_failures       INTEGER NOT NULL DEFAULT 0,
  consecutive_successes      INTEGER NOT NULL DEFAULT 0,
  total_dead_letter_count    BIGINT NOT NULL DEFAULT 0,
  total_recovered_count      BIGINT NOT NULL DEFAULT 0,
  last_failure_at            TIMESTAMPTZ,
  last_success_at            TIMESTAMPTZ,
  last_error_class           TEXT,
  last_error_family          TEXT,
  last_event_id              TEXT,
  last_dead_letter_event_id  TEXT,
  quarantined_at             TIMESTAMPTZ,
  quarantine_reason          TEXT,
  state_changed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_sync.handler_health IS
  'Authoritative current state of each reactive handler. UPSERTed on every reactive worker invocation. KPIs and dashboards read from here, not from outbox_reactive_log (which is the audit trail).';

COMMENT ON COLUMN greenhouse_sync.handler_health.current_state IS
  'State machine: healthy → degraded (>=3 consecutive failures) → failed (dead-letter or >=10 consecutive failures) → quarantined (manual or auto-quarantine). Returns to healthy on first success.';

CREATE INDEX IF NOT EXISTS idx_handler_health_state
  ON greenhouse_sync.handler_health (current_state)
  WHERE current_state <> 'healthy';

CREATE INDEX IF NOT EXISTS idx_handler_health_last_failure
  ON greenhouse_sync.handler_health (last_failure_at DESC NULLS LAST);

-- ── Table 2: handler_health_transitions ───────────────────────────────────
-- Audit trail of state transitions. Append-only.

CREATE TABLE IF NOT EXISTS greenhouse_sync.handler_health_transitions (
  transition_id              BIGSERIAL PRIMARY KEY,
  handler                    TEXT NOT NULL,
  from_state                 TEXT NOT NULL,
  to_state                   TEXT NOT NULL,
  trigger_event_id           TEXT,
  reason                     TEXT,
  transitioned_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handler_health_transitions_handler
  ON greenhouse_sync.handler_health_transitions (handler, transitioned_at DESC);

-- ── Table 3: webhook_endpoint_health ──────────────────────────────────────
-- One row per webhook endpoint. UPSERTed by the outbound webhook dispatcher.

CREATE TABLE IF NOT EXISTS greenhouse_sync.webhook_endpoint_health (
  webhook_subscription_id    TEXT PRIMARY KEY,
  current_state              TEXT NOT NULL DEFAULT 'healthy'
                               CHECK (current_state IN ('healthy', 'degraded', 'failed', 'quarantined')),
  consecutive_failures       INTEGER NOT NULL DEFAULT 0,
  consecutive_successes      INTEGER NOT NULL DEFAULT 0,
  total_dead_letter_count    BIGINT NOT NULL DEFAULT 0,
  active_dead_letter_count   INTEGER NOT NULL DEFAULT 0,
  last_failure_at            TIMESTAMPTZ,
  last_success_at            TIMESTAMPTZ,
  last_http_status           INTEGER,
  last_error_message         TEXT,
  last_dead_letter_at        TIMESTAMPTZ,
  state_changed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_sync.webhook_endpoint_health IS
  'Authoritative current state of each webhook endpoint subscription. UPSERTed by the outbound dispatcher. Dashboards count endpoints in degraded states, not individual delivery attempts.';

CREATE INDEX IF NOT EXISTS idx_webhook_endpoint_health_state
  ON greenhouse_sync.webhook_endpoint_health (current_state)
  WHERE current_state <> 'healthy';

-- ── Acknowledgment columns on the audit logs ──────────────────────────────
-- Recovery is first-class: explicit ack moves the row out of the KPI but
-- keeps it in the table for forensics.

ALTER TABLE greenhouse_sync.outbox_reactive_log
  ADD COLUMN IF NOT EXISTS acknowledged_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by  TEXT,
  ADD COLUMN IF NOT EXISTS resolution_note  TEXT,
  ADD COLUMN IF NOT EXISTS recovered_at     TIMESTAMPTZ;

COMMENT ON COLUMN greenhouse_sync.outbox_reactive_log.acknowledged_at IS
  'When an operator manually acknowledged this dead-letter row as resolved. Acknowledged rows do not count toward the active dead-letter KPI.';

COMMENT ON COLUMN greenhouse_sync.outbox_reactive_log.recovered_at IS
  'When a later attempt of the same (handler, event_id) succeeded. Auto-set by the reactive worker. Recovered rows do not count toward the active dead-letter KPI.';

CREATE INDEX IF NOT EXISTS idx_outbox_reactive_log_active_dead_letters
  ON greenhouse_sync.outbox_reactive_log (handler, reacted_at DESC)
  WHERE result = 'dead-letter' AND acknowledged_at IS NULL AND recovered_at IS NULL;

ALTER TABLE greenhouse_sync.webhook_deliveries
  ADD COLUMN IF NOT EXISTS acknowledged_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by  TEXT,
  ADD COLUMN IF NOT EXISTS resolution_note  TEXT,
  ADD COLUMN IF NOT EXISTS archived_at      TIMESTAMPTZ;

COMMENT ON COLUMN greenhouse_sync.webhook_deliveries.acknowledged_at IS
  'When an operator marked this dead-letter delivery as resolved. Excludes the row from the active dead-letter KPI without losing the audit trail.';

COMMENT ON COLUMN greenhouse_sync.webhook_deliveries.archived_at IS
  'Auto-set by retention cron for dead_letter rows older than the retention window. Excludes the row from active dashboards.';

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_active_dead_letters
  ON greenhouse_sync.webhook_deliveries (created_at DESC)
  WHERE status = 'dead_letter' AND acknowledged_at IS NULL AND archived_at IS NULL;

-- ── Backfill from current state ──────────────────────────────────────────
-- Seed handler_health from the most recent log entry per handler. This
-- gives us a coherent starting state without waiting for the next reactive
-- run to hit every handler.

INSERT INTO greenhouse_sync.handler_health (
  handler, current_state, consecutive_failures, total_dead_letter_count,
  last_failure_at, last_error_class, last_error_family, last_event_id,
  last_dead_letter_event_id, state_changed_at, updated_at
)
SELECT
  handler,
  -- State derived from latest result + active dead-letter count
  CASE
    WHEN active_dead_letters > 0 THEN 'failed'
    WHEN latest_result = 'dead-letter' THEN 'failed'
    WHEN latest_result = 'retry' THEN 'degraded'
    ELSE 'healthy'
  END AS current_state,
  CASE WHEN latest_result IN ('retry','dead-letter') THEN 1 ELSE 0 END AS consecutive_failures,
  total_dead_letters AS total_dead_letter_count,
  latest_at AS last_failure_at,
  latest_error_class AS last_error_class,
  latest_error_family AS last_error_family,
  latest_event_id AS last_event_id,
  latest_dead_letter_event_id AS last_dead_letter_event_id,
  COALESCE(latest_at, NOW()) AS state_changed_at,
  NOW() AS updated_at
FROM (
  SELECT
    handler,
    MAX(reacted_at) AS latest_at,
    (SELECT result FROM greenhouse_sync.outbox_reactive_log r2
       WHERE r2.handler = r.handler ORDER BY reacted_at DESC LIMIT 1) AS latest_result,
    (SELECT error_class FROM greenhouse_sync.outbox_reactive_log r2
       WHERE r2.handler = r.handler ORDER BY reacted_at DESC LIMIT 1) AS latest_error_class,
    (SELECT error_family FROM greenhouse_sync.outbox_reactive_log r2
       WHERE r2.handler = r.handler ORDER BY reacted_at DESC LIMIT 1) AS latest_error_family,
    (SELECT event_id FROM greenhouse_sync.outbox_reactive_log r2
       WHERE r2.handler = r.handler ORDER BY reacted_at DESC LIMIT 1) AS latest_event_id,
    (SELECT event_id FROM greenhouse_sync.outbox_reactive_log r2
       WHERE r2.handler = r.handler AND r2.result = 'dead-letter'
       ORDER BY reacted_at DESC LIMIT 1) AS latest_dead_letter_event_id,
    COUNT(*) FILTER (WHERE result = 'dead-letter') AS total_dead_letters,
    COUNT(*) FILTER (WHERE result = 'dead-letter' AND acknowledged_at IS NULL AND recovered_at IS NULL) AS active_dead_letters
    FROM greenhouse_sync.outbox_reactive_log r
   GROUP BY handler
) handler_summary
ON CONFLICT (handler) DO NOTHING;

-- Same for webhook endpoints (using delivery history as the source).
INSERT INTO greenhouse_sync.webhook_endpoint_health (
  webhook_subscription_id, current_state,
  total_dead_letter_count, active_dead_letter_count,
  last_failure_at, last_http_status, last_error_message,
  last_dead_letter_at, state_changed_at, updated_at
)
SELECT
  webhook_subscription_id,
  CASE
    WHEN active_dead_letters > 0 THEN 'failed'
    WHEN total_dead_letters > 0 THEN 'degraded'
    ELSE 'healthy'
  END AS current_state,
  total_dead_letters AS total_dead_letter_count,
  active_dead_letters AS active_dead_letter_count,
  last_failure_at,
  last_http_status,
  last_error_message,
  last_dead_letter_at,
  COALESCE(last_failure_at, NOW()) AS state_changed_at,
  NOW() AS updated_at
FROM (
  SELECT
    webhook_subscription_id,
    COUNT(*) FILTER (WHERE status = 'dead_letter') AS total_dead_letters,
    COUNT(*) FILTER (WHERE status = 'dead_letter' AND acknowledged_at IS NULL AND archived_at IS NULL) AS active_dead_letters,
    MAX(created_at) FILTER (WHERE status IN ('failed','dead_letter')) AS last_failure_at,
    MAX(created_at) FILTER (WHERE status = 'dead_letter') AS last_dead_letter_at,
    (SELECT last_http_status FROM greenhouse_sync.webhook_deliveries d2
       WHERE d2.webhook_subscription_id = d.webhook_subscription_id
       ORDER BY created_at DESC LIMIT 1) AS last_http_status,
    (SELECT last_error_message FROM greenhouse_sync.webhook_deliveries d2
       WHERE d2.webhook_subscription_id = d.webhook_subscription_id
       ORDER BY created_at DESC LIMIT 1) AS last_error_message
    FROM greenhouse_sync.webhook_deliveries d
   WHERE webhook_subscription_id IS NOT NULL
   GROUP BY webhook_subscription_id
) endpoint_summary
ON CONFLICT (webhook_subscription_id) DO NOTHING;


-- Down Migration

DROP INDEX IF EXISTS greenhouse_sync.idx_webhook_deliveries_active_dead_letters;
DROP INDEX IF EXISTS greenhouse_sync.idx_outbox_reactive_log_active_dead_letters;

ALTER TABLE greenhouse_sync.webhook_deliveries
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS resolution_note,
  DROP COLUMN IF EXISTS acknowledged_by,
  DROP COLUMN IF EXISTS acknowledged_at;

ALTER TABLE greenhouse_sync.outbox_reactive_log
  DROP COLUMN IF EXISTS recovered_at,
  DROP COLUMN IF EXISTS resolution_note,
  DROP COLUMN IF EXISTS acknowledged_by,
  DROP COLUMN IF EXISTS acknowledged_at;

DROP TABLE IF EXISTS greenhouse_sync.webhook_endpoint_health;
DROP TABLE IF EXISTS greenhouse_sync.handler_health_transitions;
DROP TABLE IF EXISTS greenhouse_sync.handler_health;
