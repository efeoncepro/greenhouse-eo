-- Up Migration
SET search_path = greenhouse_serving, greenhouse_finance, greenhouse_core, public;

-- ─── Finance AI Signals ─────────────────────────────────────────────────────
-- Domain-scoped signal store for the Finance Signal Engine. Mirrors the
-- shape of greenhouse_serving.ico_ai_signals but uses client_id and
-- organization_id as the primary scope dimensions (Finance is org/client-first,
-- not space-first). Populated by the Finance anomaly detector running in
-- Cloud Run. Consumed by the LLM enrichment worker and the Finance Dashboard.

CREATE TABLE IF NOT EXISTS greenhouse_serving.finance_ai_signals (
  signal_id           TEXT PRIMARY KEY,
  signal_type         TEXT NOT NULL,
  organization_id     TEXT,
  client_id           TEXT,
  space_id            TEXT,
  metric_name         TEXT NOT NULL,
  period_year         INT NOT NULL,
  period_month        INT NOT NULL,
  severity            TEXT,
  current_value       NUMERIC(18, 4),
  expected_value      NUMERIC(18, 4),
  z_score             NUMERIC(10, 4),
  predicted_value     NUMERIC(18, 4),
  confidence          NUMERIC(6, 4),
  prediction_horizon  TEXT,
  contribution_pct    NUMERIC(6, 4),
  dimension           TEXT,
  dimension_id        TEXT,
  action_type         TEXT,
  action_summary      TEXT,
  action_target_id    TEXT,
  model_version       TEXT NOT NULL,
  generated_at        TIMESTAMPTZ NOT NULL,
  ai_eligible         BOOLEAN NOT NULL DEFAULT TRUE,
  source              TEXT NOT NULL DEFAULT 'greenhouse_finance.anomaly_detector',
  payload_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_ai_signals_org_period
  ON greenhouse_serving.finance_ai_signals (organization_id, period_year DESC, period_month DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ai_signals_client_period
  ON greenhouse_serving.finance_ai_signals (client_id, period_year DESC, period_month DESC)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ai_signals_type_generated
  ON greenhouse_serving.finance_ai_signals (signal_type, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_ai_signals_period
  ON greenhouse_serving.finance_ai_signals (period_year DESC, period_month DESC, severity);

-- ─── Finance AI Signal Enrichments ──────────────────────────────────────────
-- LLM-generated narrative enrichments for finance signals. Populated by the
-- Cloud Run worker (POST /finance/llm-enrich). Consumed by the Finance
-- Dashboard via readFinanceAiLlmSummary().

CREATE TABLE IF NOT EXISTS greenhouse_serving.finance_ai_signal_enrichments (
  enrichment_id         TEXT PRIMARY KEY,
  run_id                TEXT NOT NULL,
  signal_id             TEXT NOT NULL,
  organization_id       TEXT,
  client_id             TEXT,
  space_id              TEXT,
  signal_type           TEXT NOT NULL,
  metric_name           TEXT NOT NULL,
  period_year           INT NOT NULL,
  period_month          INT NOT NULL,
  severity              TEXT,
  quality_score         NUMERIC(6, 2),
  explanation_summary   TEXT,
  root_cause_narrative  TEXT,
  recommended_action    TEXT,
  explanation_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_id              TEXT NOT NULL,
  prompt_version        TEXT NOT NULL,
  prompt_hash           TEXT,
  confidence            NUMERIC(6, 4),
  tokens_in             INT,
  tokens_out             INT,
  latency_ms            INT,
  status                TEXT NOT NULL,
  error_message         TEXT,
  processed_at          TIMESTAMPTZ NOT NULL,
  source                TEXT NOT NULL DEFAULT 'greenhouse_finance.llm_enrichment_worker',
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_ai_signal_enrichments_org_period
  ON greenhouse_serving.finance_ai_signal_enrichments (organization_id, period_year DESC, period_month DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ai_signal_enrichments_client_period
  ON greenhouse_serving.finance_ai_signal_enrichments (client_id, period_year DESC, period_month DESC)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ai_signal_enrichments_signal
  ON greenhouse_serving.finance_ai_signal_enrichments (signal_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_ai_signal_enrichments_status
  ON greenhouse_serving.finance_ai_signal_enrichments (status, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_ai_signal_enrichments_period
  ON greenhouse_serving.finance_ai_signal_enrichments (period_year DESC, period_month DESC, status);

-- ─── Finance AI Enrichment Runs ─────────────────────────────────────────────
-- Run metadata for audit and Ops Health visibility.

CREATE TABLE IF NOT EXISTS greenhouse_serving.finance_ai_enrichment_runs (
  run_id               TEXT PRIMARY KEY,
  trigger_event_id     TEXT,
  organization_id      TEXT,
  client_id            TEXT,
  period_year          INT NOT NULL,
  period_month         INT NOT NULL,
  trigger_type         TEXT NOT NULL,
  status               TEXT NOT NULL,
  signals_seen         INT NOT NULL DEFAULT 0,
  signals_enriched     INT NOT NULL DEFAULT 0,
  signals_failed       INT NOT NULL DEFAULT 0,
  model_id             TEXT NOT NULL,
  prompt_version       TEXT NOT NULL,
  prompt_hash           TEXT,
  tokens_in            INT,
  tokens_out            INT,
  latency_ms           INT,
  error_message        TEXT,
  started_at           TIMESTAMPTZ NOT NULL,
  completed_at         TIMESTAMPTZ,
  source               TEXT NOT NULL DEFAULT 'greenhouse_finance.llm_enrichment_worker',
  synced_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_ai_enrichment_runs_period
  ON greenhouse_serving.finance_ai_enrichment_runs (period_year DESC, period_month DESC, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_ai_enrichment_runs_status
  ON greenhouse_serving.finance_ai_enrichment_runs (status, started_at DESC);

-- ─── Grants ─────────────────────────────────────────────────────────────────

GRANT SELECT ON greenhouse_serving.finance_ai_signals TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.finance_ai_signal_enrichments TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.finance_ai_enrichment_runs TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_signals TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_signal_enrichments TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.finance_ai_enrichment_runs TO greenhouse_migrator;

-- Down Migration
SET search_path = greenhouse_serving, greenhouse_finance, greenhouse_core, public;

DROP TABLE IF EXISTS greenhouse_serving.finance_ai_enrichment_runs;
DROP TABLE IF EXISTS greenhouse_serving.finance_ai_signal_enrichments;
DROP TABLE IF EXISTS greenhouse_serving.finance_ai_signals;
