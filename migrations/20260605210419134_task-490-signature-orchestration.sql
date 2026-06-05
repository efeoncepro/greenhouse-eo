-- Up Migration
--
-- TASK-490 — Signature Orchestration Foundation (EPIC-001). Provider-neutral electronic
-- signature platform: signature_requests aggregate + signers + append-only event trail.
-- Generalizes the one-off MSA ZapSign lane. The provider adapter (ZapSign) is TASK-491.
-- Decoupled from TASK-489 (arch review): the signed artifact is a private asset; the consuming
-- domain links it via the `signature.request.completed` event. Schema: greenhouse_core (transversal).

-- 1. signature_requests — provider-neutral aggregate root + state machine.
CREATE TABLE greenhouse_core.signature_requests (
  signature_request_id      TEXT PRIMARY KEY,
  provider                  TEXT NOT NULL DEFAULT 'zapsign',
  provider_document_token   TEXT,
  status                    TEXT NOT NULL DEFAULT 'draft',
  source_kind               TEXT NOT NULL,
  source_ref                TEXT NOT NULL,
  document_asset_id         TEXT NOT NULL REFERENCES greenhouse_core.assets(asset_id) ON DELETE RESTRICT,
  signed_document_asset_id  TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  audit_report_asset_id     TEXT REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  provider_payload          JSONB NOT NULL DEFAULT '{}',
  signable_format           TEXT NOT NULL DEFAULT 'pdf',
  title                     TEXT,
  idempotency_key           TEXT UNIQUE,
  sent_at                   TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  cancel_reason             TEXT,
  failure_reason            TEXT,
  last_synced_at            TIMESTAMPTZ,
  created_by_user_id        TEXT NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT signature_requests_provider_check CHECK (provider IN ('zapsign')),
  CONSTRAINT signature_requests_status_check
    CHECK (status IN ('draft', 'sent', 'partially_signed', 'completed', 'cancelled', 'failed', 'expired')),
  CONSTRAINT signature_requests_source_kind_check
    CHECK (source_kind IN ('contracting_case', 'master_agreement')),
  CONSTRAINT signature_requests_signable_format_check CHECK (signable_format IN ('pdf', 'docx')),
  -- completed must carry the signed artifact (defense-in-depth for signed_artifact_missing signal).
  CONSTRAINT signature_requests_completed_has_signed
    CHECK (status <> 'completed' OR signed_document_asset_id IS NOT NULL)
);

COMMENT ON COLUMN greenhouse_core.signature_requests.source_kind IS
  'TASK-490 — initiating domain (contracting_case | master_agreement). The consuming domain reacts to signature.request.completed to link the signed asset (polymorphic source_ref, no FK).';
COMMENT ON COLUMN greenhouse_core.signature_requests.provider_payload IS
  'TASK-490 — raw provider state snapshot (reconciliation + out-of-order callback tolerance).';

CREATE INDEX signature_requests_provider_token_idx
  ON greenhouse_core.signature_requests (provider_document_token)
  WHERE provider_document_token IS NOT NULL;
CREATE INDEX signature_requests_source_idx
  ON greenhouse_core.signature_requests (source_kind, source_ref);
CREATE INDEX signature_requests_pending_idx
  ON greenhouse_core.signature_requests (status, sent_at)
  WHERE status IN ('sent', 'partially_signed');

-- 2. signature_request_signers — per-signer state.
CREATE TABLE greenhouse_core.signature_request_signers (
  signer_id              TEXT PRIMARY KEY,
  signature_request_id   TEXT NOT NULL REFERENCES greenhouse_core.signature_requests(signature_request_id) ON DELETE CASCADE,
  signer_name            TEXT NOT NULL,
  signer_email           TEXT,
  signer_role            TEXT NOT NULL,
  order_group            INTEGER NOT NULL DEFAULT 1,
  status                 TEXT NOT NULL DEFAULT 'pending',
  provider_signer_token  TEXT,
  signed_at              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT signature_request_signers_role_check
    CHECK (signer_role IN ('employer', 'worker', 'witness', 'counterparty', 'signer')),
  CONSTRAINT signature_request_signers_status_check
    CHECK (status IN ('pending', 'signed', 'declined')),
  CONSTRAINT signature_request_signers_order_positive CHECK (order_group > 0)
);

CREATE INDEX signature_request_signers_request_idx
  ON greenhouse_core.signature_request_signers (signature_request_id);

-- 3. signature_request_events — append-only audit trail (tolerant of out-of-order provider callbacks).
CREATE TABLE greenhouse_core.signature_request_events (
  event_id               TEXT PRIMARY KEY,
  signature_request_id   TEXT NOT NULL REFERENCES greenhouse_core.signature_requests(signature_request_id) ON DELETE RESTRICT,
  event_kind             TEXT NOT NULL,
  from_status            TEXT,
  to_status              TEXT,
  actor                  TEXT NOT NULL,
  payload_json           JSONB NOT NULL DEFAULT '{}',
  occurred_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX signature_request_events_request_idx
  ON greenhouse_core.signature_request_events (signature_request_id, occurred_at DESC);

-- Append-only enforcement (mirror TASK-765 / TASK-784 pattern).
CREATE OR REPLACE FUNCTION greenhouse_core.assert_signature_request_events_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'signature_request_events is append-only. For corrections insert a new row with payload_json.correction_of=<event_id>.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_request_events_no_update
  BEFORE UPDATE ON greenhouse_core.signature_request_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_signature_request_events_append_only();
CREATE TRIGGER signature_request_events_no_delete
  BEFORE DELETE ON greenhouse_core.signature_request_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.assert_signature_request_events_append_only();

-- 4. Ownership + grants.
ALTER TABLE greenhouse_core.signature_requests          OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.signature_request_signers   OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.signature_request_events     OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE         ON greenhouse_core.signature_requests        TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.signature_request_signers TO greenhouse_runtime;
GRANT SELECT, INSERT                 ON greenhouse_core.signature_request_events   TO greenhouse_runtime;

-- 5. Anti pre-up-marker bug guard.
DO $$
DECLARE missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing
  FROM (VALUES
    ('signature_requests'), ('signature_request_signers'), ('signature_request_events')
  ) AS expected(tbl)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'greenhouse_core' AND t.table_name = expected.tbl
  );

  IF missing > 0 THEN
    RAISE EXCEPTION 'TASK-490 anti pre-up-marker: % expected signature table(s) NOT created. Migration markers may be inverted.', missing;
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.signature_request_events;
DROP FUNCTION IF EXISTS greenhouse_core.assert_signature_request_events_append_only();
DROP TABLE IF EXISTS greenhouse_core.signature_request_signers;
DROP TABLE IF EXISTS greenhouse_core.signature_requests;
