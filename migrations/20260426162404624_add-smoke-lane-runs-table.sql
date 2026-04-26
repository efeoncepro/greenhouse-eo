-- Up Migration
--
-- Smoke lane runs table — PG-backed bus for CI smoke results.
-- =============================================================
--
-- Reliability dashboard reads `test_lane` signals (Finance smoke, Delivery
-- smoke, etc.) to know whether the latest CI smoke run for each lane passed
-- or failed. Historically the reader looked at `artifacts/playwright/results.json`
-- on the local filesystem — fine in CI runs that have that file, but at the
-- runtime where the reliability API actually serves (Vercel serverless,
-- Cloud Run ops-worker), the filesystem doesn't have that file. Result:
-- every lane stayed at `awaiting_data` permanently in production, which the
-- module aggregator then surfaced as `awaiting_data` confidence=low.
--
-- Architecturally robust fix: PG is the bus. Every CI run upserts the latest
-- smoke result into `greenhouse_sync.smoke_lane_runs`. The reader queries the
-- latest row per `lane_key` from PG. Cross-runtime, queryable, historical.
--
-- Why `greenhouse_sync` schema (not a new `greenhouse_ops`): the reliability
-- control plane already lives there (`source_sync_runs`, `outbox_events`,
-- `projection_refresh_queue`, `integration_data_quality_runs`). Adding the
-- smoke lane table keeps observability data co-located.

CREATE TABLE IF NOT EXISTS greenhouse_sync.smoke_lane_runs (
  smoke_lane_run_id TEXT PRIMARY KEY,
  lane_key TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  branch TEXT,
  workflow_run_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'flaky', 'cancelled', 'errored')),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  skipped_tests INTEGER NOT NULL DEFAULT 0,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smoke_lane_runs_latest_per_lane
  ON greenhouse_sync.smoke_lane_runs (lane_key, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_smoke_lane_runs_commit
  ON greenhouse_sync.smoke_lane_runs (commit_sha, lane_key);

COMMENT ON TABLE greenhouse_sync.smoke_lane_runs IS
'Per-CI-run smoke lane results. The reliability dashboard reader queries the '
'latest row per `lane_key` to produce the `test_lane` signal. CI workflows '
'upsert here after each smoke run (one row per lane per commit). Replaces the '
'previous filesystem-lookup approach which only worked inside CI runners.';

COMMENT ON COLUMN greenhouse_sync.smoke_lane_runs.lane_key IS
'Stable identifier for the smoke lane (e.g. `finance.web`, `delivery.web`, '
'`identity.api`). Matches the reliability registry expectations so the reader '
'can map by key without translation.';

COMMENT ON COLUMN greenhouse_sync.smoke_lane_runs.summary_json IS
'Per-suite breakdown for the dashboard drill-down. Free-form JSON so the CI '
'side can include whatever Playwright/Vitest emits without a schema migration. '
'Standard keys when present: `suites[]`, `failedSpecs[]`, `slowestSpecs[]`.';

-- Down Migration

DROP TABLE IF EXISTS greenhouse_sync.smoke_lane_runs;
