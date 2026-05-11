-- Up Migration

-- TASK-857 — GitHub Webhooks Release Event Ingestion
-- ============================================================================
-- Adds a signed GitHub provider-native inbound endpoint for release-relevant
-- events. The generic inbox remains the transport boundary; this table stores
-- the normalized, redacted control-plane metadata needed for idempotency,
-- reconciliation and reliability signals.

INSERT INTO greenhouse_sync.webhook_endpoints (
  webhook_endpoint_id,
  endpoint_key,
  provider_code,
  handler_code,
  auth_mode,
  secret_ref,
  active,
  created_at,
  updated_at
)
VALUES (
  'wh-endpoint-github-release-events',
  'github-release-events',
  'github',
  'github-release-events',
  'provider_native',
  'GITHUB_RELEASE_WEBHOOK_SECRET',
  true,
  now(),
  now()
)
ON CONFLICT (endpoint_key) DO UPDATE SET
  provider_code = EXCLUDED.provider_code,
  handler_code = EXCLUDED.handler_code,
  auth_mode = EXCLUDED.auth_mode,
  secret_ref = EXCLUDED.secret_ref,
  active = true,
  updated_at = now();

CREATE TABLE IF NOT EXISTS greenhouse_sync.github_release_webhook_events (
  github_release_webhook_event_id text PRIMARY KEY,
  webhook_inbox_event_id          text NOT NULL REFERENCES greenhouse_sync.webhook_inbox_events(webhook_inbox_event_id),
  delivery_id                     text NOT NULL,
  event_name                      text NOT NULL,
  action                          text,
  repository_full_name            text,
  workflow_name                   text,
  workflow_run_id                 bigint,
  workflow_job_id                 bigint,
  check_suite_id                  bigint,
  check_run_id                    bigint,
  deployment_id                   bigint,
  target_sha                      text,
  github_status                   text,
  github_conclusion               text,
  processing_status               text NOT NULL DEFAULT 'received',
  release_id                      text REFERENCES greenhouse_sync.release_manifests(release_id) ON DELETE SET NULL,
  matched_by                      text,
  transition_applied              boolean NOT NULL DEFAULT false,
  transition_from_state           text,
  transition_to_state             text,
  error_code                      text,
  error_message                   text,
  redacted_payload_json           jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_json                   jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at                     timestamptz NOT NULL DEFAULT now(),
  processed_at                    timestamptz,
  CONSTRAINT github_release_webhook_delivery_unique UNIQUE (delivery_id),
  CONSTRAINT github_release_webhook_inbox_unique UNIQUE (webhook_inbox_event_id),
  CONSTRAINT github_release_webhook_event_name_check
    CHECK (event_name IN (
      'workflow_run',
      'workflow_job',
      'deployment_status',
      'check_suite',
      'check_run'
    )),
  CONSTRAINT github_release_webhook_processing_status_check
    CHECK (processing_status IN (
      'received',
      'ignored',
      'matched',
      'reconciled',
      'matched_no_transition',
      'unmatched',
      'failed'
    )),
  CONSTRAINT github_release_webhook_target_sha_format_check
    CHECK (target_sha IS NULL OR (length(target_sha) >= 7 AND target_sha ~ '^[0-9a-f]+$')),
  CONSTRAINT github_release_webhook_delivery_nonempty_check
    CHECK (length(btrim(delivery_id)) > 0),
  CONSTRAINT github_release_webhook_redacted_payload_object_check
    CHECK (jsonb_typeof(redacted_payload_json) = 'object'),
  CONSTRAINT github_release_webhook_evidence_object_check
    CHECK (jsonb_typeof(evidence_json) = 'object')
);

ALTER TABLE greenhouse_sync.github_release_webhook_events OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS github_release_webhook_events_status_received_idx
  ON greenhouse_sync.github_release_webhook_events (processing_status, received_at DESC);

CREATE INDEX IF NOT EXISTS github_release_webhook_events_target_sha_idx
  ON greenhouse_sync.github_release_webhook_events (target_sha, received_at DESC)
  WHERE target_sha IS NOT NULL;

CREATE INDEX IF NOT EXISTS github_release_webhook_events_release_idx
  ON greenhouse_sync.github_release_webhook_events (release_id, received_at DESC)
  WHERE release_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS github_release_webhook_events_workflow_run_idx
  ON greenhouse_sync.github_release_webhook_events (workflow_run_id)
  WHERE workflow_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS github_release_webhook_events_unhealthy_idx
  ON greenhouse_sync.github_release_webhook_events (processed_at DESC, received_at DESC)
  WHERE processing_status IN ('unmatched', 'failed');

COMMENT ON TABLE greenhouse_sync.github_release_webhook_events IS
  'TASK-857 — Normalized redacted GitHub release webhook ledger. Generic webhook_inbox_events remains transport/idempotency boundary; this table powers release reconciliation and reliability signals.';

COMMENT ON COLUMN greenhouse_sync.github_release_webhook_events.delivery_id IS
  'X-GitHub-Delivery UUID. Unique idempotency key for GitHub webhook retries.';

COMMENT ON COLUMN greenhouse_sync.github_release_webhook_events.processing_status IS
  'received | ignored | matched | reconciled | matched_no_transition | unmatched | failed. unmatched/failed feed reliability signal; ignored covers non-release allowlisted events.';

COMMENT ON COLUMN greenhouse_sync.github_release_webhook_events.redacted_payload_json IS
  'Explicitly redacted provider metadata only. Full raw GitHub payload is intentionally not retained for this endpoint after HMAC verification.';

GRANT SELECT, INSERT, UPDATE
  ON greenhouse_sync.github_release_webhook_events TO greenhouse_runtime;

DO $$
DECLARE
  table_exists boolean;
  endpoint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'greenhouse_sync'
      AND table_name = 'github_release_webhook_events'
  ) INTO table_exists;

  SELECT EXISTS (
    SELECT 1
    FROM greenhouse_sync.webhook_endpoints
    WHERE endpoint_key = 'github-release-events'
      AND provider_code = 'github'
      AND auth_mode = 'provider_native'
      AND secret_ref = 'GITHUB_RELEASE_WEBHOOK_SECRET'
  ) INTO endpoint_exists;

  IF NOT table_exists OR NOT endpoint_exists THEN
    RAISE EXCEPTION 'TASK-857 anti pre-up-marker check failed: GitHub release webhook endpoint/table missing.';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_sync.github_release_webhook_events;

DELETE FROM greenhouse_sync.webhook_endpoints
WHERE endpoint_key = 'github-release-events'
  AND webhook_endpoint_id = 'wh-endpoint-github-release-events';
