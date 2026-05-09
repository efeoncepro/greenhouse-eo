-- Up Migration

-- TASK-808 — Engagement Audit Log
-- ============================================================================
-- Capa 8 de EPIC-014. Persiste el forensic trail append-only de decisiones y
-- side-effects de engagement. Ajustes de discovery:
--   1. service_id usa TEXT (TASK-801: greenhouse_core.services.service_id es text).
--   2. La version de eventos vive en payload_json.version; outbox_events no tiene
--      columna event_version.
--   3. Reactive idempotency vive en greenhouse_sync.outbox_reactive_log, no en
--      consumed_at/consumed_by sobre outbox_events.

CREATE TABLE greenhouse_commercial.engagement_audit_log (
  audit_id      text PRIMARY KEY DEFAULT ('engagement-audit-' || gen_random_uuid()::text),
  service_id    text NOT NULL
    REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  event_kind    text NOT NULL CHECK (event_kind = ANY (ARRAY[
    'declared'::text,
    'approved'::text,
    'rejected'::text,
    'capacity_overridden'::text,
    'phase_completed'::text,
    'progress_snapshot_recorded'::text,
    'outcome_recorded'::text,
    'lineage_added'::text,
    'converted'::text,
    'cancelled'::text
  ])),
  actor_user_id text
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  payload_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason        text,
  CONSTRAINT engagement_audit_payload_object_check
    CHECK (jsonb_typeof(payload_json) = 'object'),
  CONSTRAINT engagement_audit_reason_shape_check
    CHECK (reason IS NULL OR length(btrim(reason)) >= 10)
);

CREATE INDEX engagement_audit_service_idx
  ON greenhouse_commercial.engagement_audit_log (service_id, occurred_at DESC);

CREATE INDEX engagement_audit_kind_idx
  ON greenhouse_commercial.engagement_audit_log (event_kind, occurred_at DESC);

CREATE INDEX engagement_audit_actor_idx
  ON greenhouse_commercial.engagement_audit_log (actor_user_id, occurred_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_audit_log_assert_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'engagement_audit_log is append-only. Insert a corrective audit row instead of %.', TG_OP
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_audit_log_no_update_trigger
  BEFORE UPDATE ON greenhouse_commercial.engagement_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_audit_log_assert_append_only();

CREATE TRIGGER engagement_audit_log_no_delete_trigger
  BEFORE DELETE ON greenhouse_commercial.engagement_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_audit_log_assert_append_only();

COMMENT ON TABLE greenhouse_commercial.engagement_audit_log IS
  'TASK-808. Append-only forensic trail for Sample Sprint / engagement decisions, side-effects and downstream propagation.';

COMMENT ON COLUMN greenhouse_commercial.engagement_audit_log.service_id IS
  'FK to greenhouse_core.services(service_id). TEXT by TASK-801 contract, not UUID.';

COMMENT ON COLUMN greenhouse_commercial.engagement_audit_log.payload_json IS
  'Structured evidence for the audit event. Outbox event versioning is duplicated in payload_json.version where applicable.';

GRANT SELECT, INSERT ON TABLE greenhouse_commercial.engagement_audit_log TO greenhouse_runtime;
GRANT SELECT, INSERT ON TABLE greenhouse_commercial.engagement_audit_log TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE greenhouse_commercial.engagement_audit_log TO greenhouse_migrator;

-- Down Migration

REVOKE SELECT, INSERT ON TABLE greenhouse_commercial.engagement_audit_log FROM greenhouse_runtime;
REVOKE SELECT, INSERT ON TABLE greenhouse_commercial.engagement_audit_log FROM greenhouse_app;
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE greenhouse_commercial.engagement_audit_log FROM greenhouse_migrator;

DROP TRIGGER IF EXISTS engagement_audit_log_no_delete_trigger
  ON greenhouse_commercial.engagement_audit_log;
DROP TRIGGER IF EXISTS engagement_audit_log_no_update_trigger
  ON greenhouse_commercial.engagement_audit_log;
DROP FUNCTION IF EXISTS greenhouse_commercial.engagement_audit_log_assert_append_only();

DROP INDEX IF EXISTS greenhouse_commercial.engagement_audit_actor_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_audit_kind_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_audit_service_idx;
DROP TABLE IF EXISTS greenhouse_commercial.engagement_audit_log;
