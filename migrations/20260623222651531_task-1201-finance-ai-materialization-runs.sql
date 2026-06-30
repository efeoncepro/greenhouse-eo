-- Up Migration

-- TASK-1201 Slice 3 — Finance AI anomaly-materialization provenance ledger.
--
-- Append-only (audit-grade: NO DELETE/UPDATE) provenance del paso de
-- anomaly-materialization (`materializeFinanceSignals`). Cada ejecución del cron
-- / worker / trigger escribe una fila con `run_id` único. Es lo que permite al
-- reader distinguir honestamente:
--   - empty-positive  → corrió, economics elegible (snapshots_evaluated > 0), 0 señales
--   - empty-pending   → nunca corrió / economics no listo (snapshots_evaluated = 0)
--   - stale-degraded  → señales existen pero enrichment no, o run stale/failed
--
-- Antes de TASK-1201 la única provenance era `finance_ai_enrichment_runs`, que SOLO
-- se escribe cuando hubo señales para enriquecer; un período sano sin anomalías no
-- dejaba rastro → el reader mentía "empty-pending". Esta tabla cierra ese gap.
--
-- SoT canónica: GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md

CREATE TABLE IF NOT EXISTS greenhouse_serving.finance_ai_materialization_runs (
  materialization_run_id text PRIMARY KEY,
  trigger_event_id       text,
  organization_id        text,
  client_id              text,
  period_year            integer NOT NULL,
  period_month           integer NOT NULL,
  trigger_type           text NOT NULL,
  status                 text NOT NULL,
  snapshots_evaluated    integer NOT NULL DEFAULT 0,
  signals_written        integer NOT NULL DEFAULT 0,
  model_version          text NOT NULL,
  error_message          text,
  duration_ms            integer,
  started_at             timestamptz NOT NULL,
  completed_at           timestamptz,
  source                 text NOT NULL DEFAULT 'greenhouse_finance.anomaly_detector',
  synced_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_ai_materialization_runs_status_check
    CHECK (status IN ('succeeded', 'empty_positive', 'skipped_no_eligible_data', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_finance_ai_materialization_runs_period
  ON greenhouse_serving.finance_ai_materialization_runs (period_year DESC, period_month DESC, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_ai_materialization_runs_status
  ON greenhouse_serving.finance_ai_materialization_runs (status, started_at DESC);

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si la tabla no quedó creada.
DO $$
DECLARE expected_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_serving'
      AND table_name = 'finance_ai_materialization_runs'
  ) INTO expected_exists;

  IF NOT expected_exists THEN
    RAISE EXCEPTION 'TASK-1201 anti pre-up-marker check: greenhouse_serving.finance_ai_materialization_runs was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

-- Append-only: runtime/app solo SELECT + INSERT (sin UPDATE/DELETE — defense in depth).
GRANT SELECT, INSERT ON greenhouse_serving.finance_ai_materialization_runs TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_serving.finance_ai_materialization_runs TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_serving.finance_ai_materialization_runs;
