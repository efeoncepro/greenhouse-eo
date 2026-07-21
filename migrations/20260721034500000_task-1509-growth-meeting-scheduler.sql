-- Up Migration

-- TASK-1509 — Native meeting scheduler server adapter.
-- HubSpot remains the meeting/calendar SoT. These tables store only public-surface
-- authority, privacy-safe execution evidence and atomic abuse counters.

CREATE TABLE IF NOT EXISTS greenhouse_growth.meeting_surface_binding (
  surface_id           TEXT NOT NULL
                         REFERENCES greenhouse_growth.form_host_surface (surface_id) ON DELETE RESTRICT,
  scheduler_key        TEXT NOT NULL,
  fallback_url         TEXT NOT NULL,
  default_timezone     TEXT NOT NULL DEFAULT 'America/Santiago',
  default_locale       TEXT NOT NULL DEFAULT 'es',
  status               TEXT NOT NULL DEFAULT 'paused'
                         CHECK (status IN ('active', 'paused', 'archived')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (surface_id, scheduler_key),
  CONSTRAINT meeting_surface_binding_scheduler_key_check
    CHECK (scheduler_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  CONSTRAINT meeting_surface_binding_fallback_https_check
    CHECK (fallback_url ~ '^https://')
);

CREATE TABLE IF NOT EXISTS greenhouse_growth.meeting_booking_execution (
  execution_id              TEXT PRIMARY KEY DEFAULT ('mbex-' || gen_random_uuid()::text),
  surface_id                TEXT NOT NULL,
  scheduler_key             TEXT NOT NULL,
  idempotency_key_hmac      TEXT NOT NULL,
  request_fingerprint       TEXT NOT NULL,
  booking_fingerprint       TEXT NOT NULL,
  email_hmac                TEXT NOT NULL,
  ip_hmac                   TEXT,
  digest_key_version        TEXT NOT NULL,
  requested_start_at        TIMESTAMPTZ NOT NULL,
  requested_duration_ms     INTEGER NOT NULL,
  requested_timezone        TEXT NOT NULL,
  requested_locale          TEXT NOT NULL,
  attribution_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
  state                     TEXT NOT NULL DEFAULT 'claimed',
  safe_outcome              TEXT,
  safe_error_category       TEXT,
  provider_dispatched_at    TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  reconciled_at             TIMESTAMPTZ,
  conversion_receipt_hash  TEXT,
  receipt_consumed_at       TIMESTAMPTZ,
  replay_count              INTEGER NOT NULL DEFAULT 0,
  retain_until              TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days'),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT meeting_booking_execution_surface_fk
    FOREIGN KEY (surface_id, scheduler_key)
    REFERENCES greenhouse_growth.meeting_surface_binding (surface_id, scheduler_key) ON DELETE RESTRICT,
  CONSTRAINT meeting_booking_execution_state_check
    CHECK (state IN (
      'claimed', 'failed_prewrite', 'provider_dispatched', 'succeeded',
      'failed_terminal', 'ambiguous', 'provider_created_invalid'
    )),
  CONSTRAINT meeting_booking_execution_duration_check
    CHECK (requested_duration_ms > 0 AND requested_duration_ms % 60000 = 0),
  CONSTRAINT meeting_booking_execution_replay_count_check CHECK (replay_count >= 0),
  CONSTRAINT meeting_booking_execution_hmac_shapes_check
    CHECK (
      idempotency_key_hmac ~ '^[a-f0-9]{64}$' AND
      request_fingerprint ~ '^[a-f0-9]{64}$' AND
      booking_fingerprint ~ '^[a-f0-9]{64}$' AND
      email_hmac ~ '^[a-f0-9]{64}$' AND
      (ip_hmac IS NULL OR ip_hmac ~ '^[a-f0-9]{64}$') AND
      (conversion_receipt_hash IS NULL OR conversion_receipt_hash ~ '^[a-f0-9]{64}$')
    ),
  CONSTRAINT meeting_booking_execution_dispatch_state_check
    CHECK (
      state IN ('claimed', 'failed_prewrite') OR provider_dispatched_at IS NOT NULL
    ),
  CONSTRAINT meeting_booking_execution_success_receipt_check
    CHECK (
      state <> 'succeeded' OR
      (conversion_receipt_hash IS NOT NULL AND completed_at IS NOT NULL AND safe_outcome = 'confirmed')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS meeting_booking_execution_idempotency_uq
  ON greenhouse_growth.meeting_booking_execution (surface_id, scheduler_key, idempotency_key_hmac);

-- Different client keys cannot race/create the same semantic booking while a claim
-- may still produce an external side effect. A failed-prewrite/definitive failure leaves
-- this partial set and can be attempted again with fresh availability.
CREATE UNIQUE INDEX IF NOT EXISTS meeting_booking_execution_active_booking_uq
  ON greenhouse_growth.meeting_booking_execution (surface_id, scheduler_key, booking_fingerprint)
  WHERE state IN ('claimed', 'provider_dispatched', 'succeeded', 'ambiguous', 'provider_created_invalid');

CREATE UNIQUE INDEX IF NOT EXISTS meeting_booking_execution_receipt_uq
  ON greenhouse_growth.meeting_booking_execution (conversion_receipt_hash)
  WHERE conversion_receipt_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS meeting_booking_execution_state_created_idx
  ON greenhouse_growth.meeting_booking_execution (state, created_at DESC);

CREATE INDEX IF NOT EXISTS meeting_booking_execution_retention_idx
  ON greenhouse_growth.meeting_booking_execution (retain_until);

CREATE TABLE IF NOT EXISTS greenhouse_growth.meeting_rate_limit_bucket (
  action             TEXT NOT NULL CHECK (action IN ('availability', 'book')),
  surface_id         TEXT NOT NULL,
  scheduler_key      TEXT NOT NULL,
  subject_kind       TEXT NOT NULL CHECK (subject_kind IN ('email', 'ip')),
  subject_hmac       TEXT NOT NULL CHECK (subject_hmac ~ '^[a-f0-9]{64}$'),
  digest_key_version TEXT NOT NULL,
  bucket_start       TIMESTAMPTZ NOT NULL,
  hit_count          INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (action, surface_id, scheduler_key, subject_kind, subject_hmac, bucket_start),
  CONSTRAINT meeting_rate_limit_bucket_surface_fk
    FOREIGN KEY (surface_id, scheduler_key)
    REFERENCES greenhouse_growth.meeting_surface_binding (surface_id, scheduler_key) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS meeting_rate_limit_bucket_cleanup_idx
  ON greenhouse_growth.meeting_rate_limit_bucket (bucket_start);

CREATE TABLE IF NOT EXISTS greenhouse_growth.meeting_runtime_rollup (
  metric_kind    TEXT NOT NULL CHECK (metric_kind IN (
                   'availability_failed', 'booking_failed', 'offline_booking_detected',
                   'duplicate_prevented', 'booking_confirmed'
                 )),
  surface_id     TEXT NOT NULL,
  scheduler_key  TEXT NOT NULL,
  bucket_start   TIMESTAMPTZ NOT NULL,
  observed_count INTEGER NOT NULL DEFAULT 0 CHECK (observed_count >= 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (metric_kind, surface_id, scheduler_key, bucket_start),
  CONSTRAINT meeting_runtime_rollup_surface_fk
    FOREIGN KEY (surface_id, scheduler_key)
    REFERENCES greenhouse_growth.meeting_surface_binding (surface_id, scheduler_key) ON DELETE RESTRICT
);

-- Pilot authority is present but paused. Flags are independently default-OFF, so this
-- row does not expose a read or write path until an explicit rollout.
INSERT INTO greenhouse_growth.meeting_surface_binding (
  surface_id,
  scheduler_key,
  fallback_url,
  default_timezone,
  default_locale,
  status
) VALUES (
  'fhsf-efeonce-lead-gen-web',
  'discovery',
  'https://meetings.hubspot.com/efeoncepro/agenda-discovery',
  'America/Santiago',
  'es',
  'paused'
)
ON CONFLICT (surface_id, scheduler_key) DO NOTHING;

ALTER TABLE greenhouse_growth.meeting_surface_binding OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.meeting_booking_execution OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.meeting_rate_limit_bucket OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.meeting_runtime_rollup OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.meeting_surface_binding TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.meeting_booking_execution TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.meeting_rate_limit_bucket TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.meeting_runtime_rollup TO greenhouse_runtime;

COMMENT ON TABLE greenhouse_growth.meeting_booking_execution IS
  'TASK-1509 privacy-safe scheduler idempotency/reconciliation ledger. No raw attendee PII or provider identifiers.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_indexes
     WHERE schemaname = 'greenhouse_growth'
       AND indexname = 'meeting_booking_execution_active_booking_uq'
  ) THEN
    RAISE EXCEPTION 'TASK-1509 anti pre-up-marker: active booking uniqueness index missing';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.meeting_rate_limit_bucket;
DROP TABLE IF EXISTS greenhouse_growth.meeting_runtime_rollup;
DROP TABLE IF EXISTS greenhouse_growth.meeting_booking_execution;
DROP TABLE IF EXISTS greenhouse_growth.meeting_surface_binding;
