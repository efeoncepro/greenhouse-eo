-- Up Migration

-- TASK-849 Slice 3 — Production Release Watchdog: alert dedup state.
-- ============================================================================
-- Tabla minima para evitar spam Teams:
--   1. UPSERT por (workflow_name, run_id, alert_kind) — permite que el mismo
--      run dispare alertas de kinds distintos (e.g. mismo run alerta primero
--      como pending_without_jobs y luego como stale_approval por escalation).
--   2. Watchdog alerta SOLO cuando: blocker nuevo, escalation severity, o
--      ultimo alert > 24h (re-recordatorio diario).
--   3. Cuando blocker se resuelve: borrar row dedup + emitir recovery alert.
--
-- Decisiones arquitectonicas (arch-architect):
--   - Schema `greenhouse_sync` (NO greenhouse_ops que es ROLE) — mismo
--     override que TASK-848. Tabla es platform infrastructure (sync metadata).
--   - PK compuesta (workflow_name, run_id, alert_kind) — evita duplicados
--     y permite kinds distintos por run.
--   - CHECK enum sobre alert_kind y last_alerted_severity — contract DB
--     hard-enforced.
--   - Owner ROLE greenhouse_ops, GRANTs runtime + read.

CREATE TABLE IF NOT EXISTS greenhouse_sync.release_watchdog_alert_state (
  workflow_name           text NOT NULL,
  run_id                  bigint NOT NULL,
  alert_kind              text NOT NULL,
  last_alerted_severity   text NOT NULL,
  last_alerted_at         timestamptz NOT NULL DEFAULT now(),
  first_observed_at       timestamptz NOT NULL DEFAULT now(),
  alert_count             integer NOT NULL DEFAULT 1,
  metadata_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (workflow_name, run_id, alert_kind),
  CONSTRAINT release_watchdog_alert_kind_check
    CHECK (alert_kind IN (
      'stale_approval',
      'pending_without_jobs',
      'worker_revision_drift'
    )),
  CONSTRAINT release_watchdog_severity_check
    CHECK (last_alerted_severity IN ('warning', 'error', 'critical')),
  CONSTRAINT release_watchdog_alert_count_positive
    CHECK (alert_count >= 1),
  CONSTRAINT release_watchdog_workflow_name_nonempty
    CHECK (length(btrim(workflow_name)) > 0)
);

ALTER TABLE greenhouse_sync.release_watchdog_alert_state OWNER TO greenhouse_ops;

-- Index para lookup "alerts activas mas viejas que X" (recovery sweep).
CREATE INDEX IF NOT EXISTS release_watchdog_alert_state_observed_idx
  ON greenhouse_sync.release_watchdog_alert_state (first_observed_at);

-- Index para lookup por workflow + kind (drilldown alert history per workflow).
CREATE INDEX IF NOT EXISTS release_watchdog_alert_state_workflow_kind_idx
  ON greenhouse_sync.release_watchdog_alert_state (workflow_name, alert_kind, last_alerted_at DESC);

COMMENT ON TABLE greenhouse_sync.release_watchdog_alert_state IS
  'TASK-849 — Dedup state minimo para watchdog alerts Teams. UPSERT por (workflow_name, run_id, alert_kind). Borrar row cuando blocker se resuelve. NO es audit log (audit deriva de GitHub Actions + Cloud Run history append-only por design platform).';

COMMENT ON COLUMN greenhouse_sync.release_watchdog_alert_state.alert_kind IS
  'Tipo de finding: stale_approval | pending_without_jobs | worker_revision_drift. Mismo run puede tener N rows con kinds distintos.';

COMMENT ON COLUMN greenhouse_sync.release_watchdog_alert_state.last_alerted_severity IS
  'Severity ultima alerta enviada. Usado para detectar escalation (warning → error → critical) y trigger re-alert.';

COMMENT ON COLUMN greenhouse_sync.release_watchdog_alert_state.alert_count IS
  'Total de alerts enviadas para este (workflow, run, kind). Incrementa con cada escalation o daily reminder.';

-- GRANTs:
-- runtime puede leer + insert + update + delete (lifecycle completo del dedup).
-- NO usamos triggers anti-DELETE: cuando blocker se resuelve, el row debe
-- borrarse para que un run nuevo del mismo workflow pueda alertar fresh.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_sync.release_watchdog_alert_state TO greenhouse_runtime;

-- Anti pre-up-marker bug verification (TASK-768/838/611 lineage).
DO $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_sync' AND table_name = 'release_watchdog_alert_state'
  ) INTO table_exists;
  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-849 anti pre-up-marker check: greenhouse_sync.release_watchdog_alert_state was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;


-- Down Migration

DROP TABLE IF EXISTS greenhouse_sync.release_watchdog_alert_state;
