-- Up Migration

-- TASK-1746 — Recovery gobernado del acceso a candidate tests.
-- El receipt es idempotente y sólo permite cerrar outcome/delivery; el event es audit
-- append-only. Ninguna tabla guarda token, URL, email, teléfono, nombre, texto libre o error.

INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled)
VALUES ('hiring_assessment_access_recovery', FALSE)
ON CONFLICT (email_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_access_recovery (
  recovery_id          TEXT PRIMARY KEY DEFAULT ('harc-' || gen_random_uuid()::text),
  assessment_id        TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment (assessment_id) ON DELETE RESTRICT,
  application_id       TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE RESTRICT,
  opening_id           TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_opening (opening_id) ON DELETE RESTRICT,
  actor_user_id        TEXT NOT NULL,
  channel              TEXT NOT NULL CHECK (channel IN ('email', 'secure_link')),
  reason_code          TEXT NOT NULL CHECK (reason_code IN (
                         'candidate_reports_email_not_received', 'candidate_reports_link_invalid',
                         'alternate_channel_requested', 'provider_delivery_failed', 'token_expired_before_start')),
  idempotency_digest   TEXT NOT NULL CHECK (idempotency_digest ~ '^[a-f0-9]{64}$'),
  request_fingerprint  TEXT NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  previous_status      TEXT NOT NULL CHECK (previous_status IN ('assigned', 'sent', 'in_progress', 'expired')),
  resulting_status     TEXT NOT NULL CHECK (resulting_status IN ('sent', 'in_progress')),
  token_version_id     UUID NOT NULL DEFAULT gen_random_uuid(),
  issued_at            TIMESTAMPTZ NOT NULL,
  expires_at           TIMESTAMPTZ NOT NULL,
  outcome              TEXT NOT NULL CHECK (outcome IN (
                         'pending_dispatch', 'dispatch_accepted', 'dispatch_failed',
                         'dispatch_unknown', 'link_issued')),
  delivery_id          UUID REFERENCES greenhouse_notifications.email_deliveries (delivery_id) ON DELETE RESTRICT,
  retention_class      TEXT NOT NULL DEFAULT 'hiring_candidate_recovery'
                         CHECK (retention_class IN ('hiring_candidate_recovery', 'workforce_record')),
  retention_expires_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (actor_user_id, assessment_id, channel, idempotency_digest),
  CHECK (expires_at > issued_at),
  CHECK (retention_expires_at IS NULL OR retention_expires_at >= issued_at),
  CHECK ((channel = 'email' AND expires_at <= issued_at + INTERVAL '14 days')
      OR (channel = 'secure_link' AND expires_at <= issued_at + INTERVAL '24 hours')),
  CHECK ((previous_status IN ('assigned', 'sent', 'expired') AND resulting_status = 'sent')
      OR (previous_status = 'in_progress' AND resulting_status = 'in_progress')),
  CHECK ((channel = 'email' AND outcome IN (
               'pending_dispatch', 'dispatch_accepted', 'dispatch_failed', 'dispatch_unknown'
             ) AND delivery_id IS NOT NULL)
      OR (channel = 'secure_link' AND outcome = 'link_issued' AND delivery_id IS NULL))
);

ALTER TABLE greenhouse_hiring.hiring_assessment_access_recovery OWNER TO greenhouse_ops;

CREATE INDEX IF NOT EXISTS hiring_assessment_access_recovery_assessment_recent_idx
  ON greenhouse_hiring.hiring_assessment_access_recovery (assessment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hiring_assessment_access_recovery_pending_idx
  ON greenhouse_hiring.hiring_assessment_access_recovery (created_at)
  WHERE outcome IN ('pending_dispatch', 'dispatch_unknown');
CREATE INDEX IF NOT EXISTS hiring_assessment_access_recovery_retention_idx
  ON greenhouse_hiring.hiring_assessment_access_recovery (retention_expires_at)
  WHERE retention_expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION greenhouse_hiring.assessment_access_recovery_deadline(
  p_started_at timestamptz, p_time_limit_minutes integer, p_accommodations jsonb
) RETURNS timestamptz
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN p_started_at IS NULL THEN NULL
    WHEN p_time_limit_minutes IS NULL THEN p_started_at + INTERVAL '24 hours'
    ELSE p_started_at + make_interval(mins => p_time_limit_minutes + GREATEST(0, COALESCE(
      CASE WHEN (p_accommodations->>'extraMinutes') ~ '^[0-9]+(\.[0-9]+)?$'
        THEN FLOOR((p_accommodations->>'extraMinutes')::numeric)::int END,
      0
    ))) + INTERVAL '30 minutes'
  END
$$;

ALTER FUNCTION greenhouse_hiring.assessment_access_recovery_deadline(timestamptz, integer, jsonb)
  OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_hiring.assessment_access_recovery_deadline(timestamptz, integer, jsonb)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION greenhouse_hiring.assessment_access_recovery_deadline(timestamptz, integer, jsonb)
  TO greenhouse_runtime, greenhouse_ops;

CREATE OR REPLACE FUNCTION greenhouse_hiring.validate_assessment_access_recovery_receipt()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  canonical_application_id text;
  canonical_opening_id text;
  canonical_method text;
  canonical_assessment_status text;
  canonical_candidate_facet_id text;
  application_stage text;
  application_decision text;
  application_decision_at timestamptz;
  application_updated_at timestamptz;
  candidate_consent_status text;
  canonical_started_at timestamptz;
  canonical_token_expires_at timestamptz;
  canonical_time_limit_minutes integer;
  canonical_accommodations jsonb;
  canonical_deadline timestamptz;
  delivery_email_type text;
  delivery_source_event_id text;
  delivery_source_entity text;
  expected_source_event_id text;
BEGIN
  -- Orden de lock canónico: assessment → application → candidate facet. Evita que una
  -- decisión o retiro de consentimiento confirme entre la validación y el commit.
  SELECT application_id, method, status, started_at, token_expires_at, time_limit_minutes, accommodations_json
    INTO canonical_application_id, canonical_method, canonical_assessment_status, canonical_started_at,
         canonical_token_expires_at, canonical_time_limit_minutes, canonical_accommodations
  FROM greenhouse_hiring.hiring_assessment
  WHERE assessment_id = NEW.assessment_id
  FOR UPDATE;

  SELECT opening_id, candidate_facet_id, stage, decision, decision_at, updated_at
    INTO canonical_opening_id, canonical_candidate_facet_id, application_stage,
         application_decision, application_decision_at, application_updated_at
  FROM greenhouse_hiring.hiring_application
  WHERE application_id = canonical_application_id
  FOR UPDATE;

  SELECT consent_status INTO candidate_consent_status
  FROM greenhouse_hiring.candidate_facet
  WHERE candidate_facet_id = canonical_candidate_facet_id
  FOR UPDATE;

  IF canonical_application_id IS NULL OR canonical_opening_id IS NULL OR candidate_consent_status IS NULL
     OR canonical_method <> 'candidate_test'
     OR NEW.application_id <> canonical_application_id OR NEW.opening_id <> canonical_opening_id
     OR NEW.previous_status <> canonical_assessment_status THEN
    RAISE EXCEPTION 'assessment access recovery lineage inválida (TASK-1746)' USING ERRCODE = '23514';
  END IF;

  IF candidate_consent_status = 'withdrawn' THEN
    RAISE EXCEPTION 'assessment access recovery consent withdrawn (TASK-1746)' USING ERRCODE = '23514';
  END IF;
  IF application_decision IS NOT NULL
     OR application_stage IN ('selected', 'rejected', 'withdrawn', 'handoff_ready', 'closed') THEN
    RAISE EXCEPTION 'assessment access recovery application closed (TASK-1746)' USING ERRCODE = '23514';
  END IF;
  IF NEW.previous_status IN ('assigned', 'sent') AND canonical_started_at IS NOT NULL THEN
    RAISE EXCEPTION 'assessment access recovery unstarted state invalid (TASK-1746)' USING ERRCODE = '23514';
  END IF;
  IF NEW.previous_status = 'in_progress' AND canonical_started_at IS NULL THEN
    RAISE EXCEPTION 'assessment access recovery in-progress state invalid (TASK-1746)' USING ERRCODE = '23514';
  END IF;
  IF NEW.previous_status = 'in_progress' THEN
    canonical_deadline := greenhouse_hiring.assessment_access_recovery_deadline(
      canonical_started_at, canonical_time_limit_minutes, canonical_accommodations);
    IF canonical_deadline <= clock_timestamp() OR NEW.expires_at > canonical_deadline THEN
      RAISE EXCEPTION 'assessment access recovery in-progress deadline exceeded (TASK-1746)' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.previous_status = 'expired' AND (
       canonical_started_at IS NOT NULL OR canonical_token_expires_at IS NULL
       OR canonical_token_expires_at > NOW() OR NEW.reason_code <> 'token_expired_before_start') THEN
    RAISE EXCEPTION 'assessment access recovery expired state not proven (TASK-1746)' USING ERRCODE = '23514';
  END IF;

  IF NEW.channel = 'email' THEN
    SELECT email_type, source_event_id, source_entity
      INTO delivery_email_type, delivery_source_event_id, delivery_source_entity
    FROM greenhouse_notifications.email_deliveries
    WHERE delivery_id = NEW.delivery_id
    FOR SHARE;

    expected_source_event_id := 'assessment-access-recovery:' || encode(sha256(convert_to(
      format('email:v1:%s:%s:%s', NEW.actor_user_id, NEW.assessment_id, NEW.idempotency_digest),
      'UTF8'
    )), 'hex');

    IF delivery_email_type IS DISTINCT FROM 'hiring_assessment_access_recovery'
       OR delivery_source_entity IS DISTINCT FROM NEW.assessment_id
       OR delivery_source_event_id IS DISTINCT FROM expected_source_event_id THEN
      RAISE EXCEPTION 'assessment access recovery delivery intent inválido (TASK-1746)'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW.retention_class := 'hiring_candidate_recovery';
  NEW.retention_expires_at := NULL;
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_hiring_assessment_access_recovery_validate
  BEFORE INSERT ON greenhouse_hiring.hiring_assessment_access_recovery
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.validate_assessment_access_recovery_receipt();

CREATE OR REPLACE FUNCTION greenhouse_hiring.validate_assessment_access_recovery_final_state()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  canonical_status text;
  canonical_started_at timestamptz;
  canonical_time_limit_minutes integer;
  canonical_accommodations jsonb;
  canonical_deadline timestamptz;
  application_stage text;
  application_decision text;
  candidate_consent_status text;
BEGIN
  SELECT assessment.status, assessment.started_at, assessment.time_limit_minutes,
         assessment.accommodations_json, application.stage, application.decision, facet.consent_status
    INTO canonical_status, canonical_started_at, canonical_time_limit_minutes,
         canonical_accommodations, application_stage, application_decision, candidate_consent_status
  FROM greenhouse_hiring.hiring_assessment assessment
  JOIN greenhouse_hiring.hiring_application application
    ON application.application_id = assessment.application_id
  JOIN greenhouse_hiring.candidate_facet facet
    ON facet.candidate_facet_id = application.candidate_facet_id
  WHERE assessment.assessment_id = NEW.assessment_id;
  IF canonical_status IS DISTINCT FROM NEW.resulting_status THEN
    RAISE EXCEPTION 'assessment access recovery final state mismatch (TASK-1746)' USING ERRCODE = '23514';
  END IF;
  IF NEW.resulting_status = 'sent' AND canonical_started_at IS NOT NULL THEN
    RAISE EXCEPTION 'assessment access recovery final unstarted state mismatch (TASK-1746)' USING ERRCODE = '23514';
  END IF;
  IF NEW.resulting_status = 'in_progress' THEN
    canonical_deadline := greenhouse_hiring.assessment_access_recovery_deadline(
      canonical_started_at, canonical_time_limit_minutes, canonical_accommodations);
    IF canonical_deadline IS NULL OR canonical_deadline <= clock_timestamp()
       OR NEW.expires_at > canonical_deadline THEN
      RAISE EXCEPTION 'assessment access recovery final deadline exceeded (TASK-1746)' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF candidate_consent_status = 'withdrawn' OR application_decision IS NOT NULL
     OR application_stage IN ('selected', 'rejected', 'withdrawn', 'handoff_ready', 'closed') THEN
    RAISE EXCEPTION 'assessment access recovery final eligibility mismatch (TASK-1746)' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END
$$;

CREATE CONSTRAINT TRIGGER trg_hiring_assessment_access_recovery_final_state
  AFTER INSERT ON greenhouse_hiring.hiring_assessment_access_recovery
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.validate_assessment_access_recovery_final_state();

CREATE OR REPLACE FUNCTION greenhouse_hiring.guard_assessment_access_recovery_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.recovery_id, NEW.assessment_id, NEW.application_id, NEW.opening_id,
      NEW.actor_user_id, NEW.channel, NEW.reason_code, NEW.idempotency_digest,
      NEW.request_fingerprint, NEW.previous_status, NEW.resulting_status,
      NEW.token_version_id, NEW.issued_at, NEW.expires_at,
      NEW.created_at)
    IS DISTINCT FROM
    ROW(OLD.recovery_id, OLD.assessment_id, OLD.application_id, OLD.opening_id,
      OLD.actor_user_id, OLD.channel, OLD.reason_code, OLD.idempotency_digest,
      OLD.request_fingerprint, OLD.previous_status, OLD.resulting_status,
      OLD.token_version_id, OLD.issued_at, OLD.expires_at,
      OLD.created_at) THEN
    RAISE EXCEPTION 'assessment access recovery receipt immutable fields changed (TASK-1746)' USING ERRCODE = '55000';
  END IF;

  IF NEW.outcome <> OLD.outcome AND NOT (
    (OLD.outcome = 'pending_dispatch' AND NEW.outcome IN ('dispatch_accepted', 'dispatch_failed', 'dispatch_unknown'))
    OR (OLD.outcome = 'dispatch_unknown' AND NEW.outcome IN ('dispatch_accepted', 'dispatch_failed'))
  ) THEN
    RAISE EXCEPTION 'assessment access recovery transition % -> % inválida', OLD.outcome, NEW.outcome USING ERRCODE = '23514';
  END IF;
  IF NEW.delivery_id IS DISTINCT FROM OLD.delivery_id THEN
    RAISE EXCEPTION 'assessment access recovery delivery immutable (TASK-1746)'
      USING ERRCODE = '55000';
  END IF;
  IF NEW.updated_at < OLD.updated_at THEN
    RAISE EXCEPTION 'assessment access recovery updated_at cannot regress (TASK-1746)'
      USING ERRCODE = '22007';
  END IF;
  IF (NEW.retention_class, NEW.retention_expires_at) IS DISTINCT FROM
     (OLD.retention_class, OLD.retention_expires_at)
     AND NOT (current_user = 'greenhouse_ops'
       AND current_setting('greenhouse.assessment_recovery_retention_refresh', true) = 'on') THEN
    RAISE EXCEPTION 'assessment access recovery retention fields changed outside governed refresh (TASK-1746)'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_hiring_assessment_access_recovery_update_guard
  BEFORE UPDATE ON greenhouse_hiring.hiring_assessment_access_recovery
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.guard_assessment_access_recovery_update();

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_access_recovery_event (
  recovery_event_id    TEXT PRIMARY KEY DEFAULT ('hare-' || gen_random_uuid()::text),
  recovery_id          TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment_access_recovery (recovery_id) ON DELETE RESTRICT,
  assessment_id        TEXT NOT NULL,
  application_id       TEXT NOT NULL,
  opening_id           TEXT NOT NULL,
  actor_user_id        TEXT NOT NULL,
  channel              TEXT NOT NULL CHECK (channel IN ('email', 'secure_link')),
  reason_code          TEXT NOT NULL CHECK (reason_code IN (
                         'candidate_reports_email_not_received', 'candidate_reports_link_invalid',
                         'alternate_channel_requested', 'provider_delivery_failed', 'token_expired_before_start')),
  idempotency_digest   TEXT NOT NULL CHECK (idempotency_digest ~ '^[a-f0-9]{64}$'),
  request_fingerprint  TEXT NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  previous_status      TEXT NOT NULL CHECK (previous_status IN ('assigned', 'sent', 'in_progress', 'expired')),
  resulting_status     TEXT NOT NULL CHECK (resulting_status IN ('sent', 'in_progress')),
  token_version_id     UUID NOT NULL,
  issued_at            TIMESTAMPTZ NOT NULL,
  expires_at           TIMESTAMPTZ NOT NULL,
  outcome              TEXT NOT NULL CHECK (outcome IN (
                         'pending_dispatch', 'dispatch_accepted', 'dispatch_failed',
                         'dispatch_unknown', 'link_issued')),
  delivery_id          UUID REFERENCES greenhouse_notifications.email_deliveries (delivery_id) ON DELETE RESTRICT,
  retention_class      TEXT NOT NULL CHECK (retention_class IN ('hiring_candidate_recovery', 'workforce_record')),
  retention_expires_at TIMESTAMPTZ,
  occurred_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recovery_id, outcome)
);

ALTER TABLE greenhouse_hiring.hiring_assessment_access_recovery_event OWNER TO greenhouse_ops;

CREATE OR REPLACE FUNCTION greenhouse_hiring.populate_assessment_access_recovery_event()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE receipt greenhouse_hiring.hiring_assessment_access_recovery%ROWTYPE;
BEGIN
  SELECT * INTO receipt FROM greenhouse_hiring.hiring_assessment_access_recovery
  WHERE recovery_id = NEW.recovery_id;

  IF receipt.recovery_id IS NULL OR NEW.outcome <> receipt.outcome
     OR NEW.delivery_id IS DISTINCT FROM receipt.delivery_id THEN
    RAISE EXCEPTION 'assessment access recovery event no coincide con receipt (TASK-1746)' USING ERRCODE = '23514';
  END IF;

  NEW.assessment_id := receipt.assessment_id;
  NEW.application_id := receipt.application_id;
  NEW.opening_id := receipt.opening_id;
  NEW.actor_user_id := receipt.actor_user_id;
  NEW.channel := receipt.channel;
  NEW.reason_code := receipt.reason_code;
  NEW.idempotency_digest := receipt.idempotency_digest;
  NEW.request_fingerprint := receipt.request_fingerprint;
  NEW.previous_status := receipt.previous_status;
  NEW.resulting_status := receipt.resulting_status;
  NEW.token_version_id := receipt.token_version_id;
  NEW.issued_at := receipt.issued_at;
  NEW.expires_at := receipt.expires_at;
  NEW.retention_class := receipt.retention_class;
  NEW.retention_expires_at := receipt.retention_expires_at;
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_hiring_assessment_access_recovery_event_populate
  BEFORE INSERT ON greenhouse_hiring.hiring_assessment_access_recovery_event
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.populate_assessment_access_recovery_event();

CREATE OR REPLACE FUNCTION greenhouse_hiring.prevent_assessment_access_recovery_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_user = 'greenhouse_ops'
     AND current_setting('greenhouse.assessment_recovery_retention_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'hiring_assessment_access_recovery_event es append-only (TASK-1746): % no permitido', TG_OP;
END
$$;

CREATE TRIGGER trg_hiring_assessment_access_recovery_event_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_hiring.hiring_assessment_access_recovery_event
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_assessment_access_recovery_event_mutation();

CREATE OR REPLACE FUNCTION greenhouse_hiring.emit_assessment_access_recovery_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, greenhouse_hiring AS $$
BEGIN
  INSERT INTO greenhouse_hiring.hiring_assessment_access_recovery_event
    (recovery_id, outcome, delivery_id)
  VALUES (NEW.recovery_id, NEW.outcome, NEW.delivery_id);
  RETURN NEW;
END
$$;

ALTER FUNCTION greenhouse_hiring.emit_assessment_access_recovery_event() OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_hiring.emit_assessment_access_recovery_event() FROM PUBLIC, greenhouse_runtime;

CREATE TRIGGER trg_hiring_assessment_access_recovery_event_on_insert
  AFTER INSERT ON greenhouse_hiring.hiring_assessment_access_recovery
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.emit_assessment_access_recovery_event();

CREATE TRIGGER trg_hiring_assessment_access_recovery_event_on_outcome
  AFTER UPDATE OF outcome, delivery_id ON greenhouse_hiring.hiring_assessment_access_recovery
  FOR EACH ROW WHEN (OLD.outcome IS DISTINCT FROM NEW.outcome OR OLD.delivery_id IS DISTINCT FROM NEW.delivery_id)
  EXECUTE FUNCTION greenhouse_hiring.emit_assessment_access_recovery_event();

CREATE OR REPLACE FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, greenhouse_hiring AS $$
BEGIN
  PERFORM set_config('greenhouse.assessment_recovery_retention_refresh', 'on', true);
  UPDATE greenhouse_hiring.hiring_assessment_access_recovery
  SET retention_class = CASE
        WHEN retention_class = 'workforce_record' OR NEW.stage = 'selected' OR NEW.decision = 'selected'
          THEN 'workforce_record'
        ELSE 'hiring_candidate_recovery'
      END,
      retention_expires_at = CASE
        WHEN retention_class = 'workforce_record' OR NEW.stage = 'selected' OR NEW.decision = 'selected' THEN NULL
        WHEN NEW.stage IN ('rejected', 'withdrawn') OR NEW.decision IN ('rejected', 'withdrawn')
          THEN COALESCE(NEW.decision_at, NOW()) + INTERVAL '12 months'
        ELSE NULL
      END,
      updated_at = NOW()
  WHERE application_id = NEW.application_id
    AND (OLD.stage IS DISTINCT FROM NEW.stage OR OLD.decision IS DISTINCT FROM NEW.decision
      OR OLD.decision_at IS DISTINCT FROM NEW.decision_at);
  RETURN NEW;
END
$$;

ALTER FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application() OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application()
  FROM PUBLIC, greenhouse_runtime;

CREATE TRIGGER trg_hiring_application_assessment_recovery_retention
  AFTER UPDATE OF stage, decision, decision_at ON greenhouse_hiring.hiring_application
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application();

CREATE OR REPLACE FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_consent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, greenhouse_hiring AS $$
BEGIN
  IF OLD.consent_status IS DISTINCT FROM NEW.consent_status AND NEW.consent_status = 'withdrawn' THEN
    PERFORM set_config('greenhouse.assessment_recovery_retention_refresh', 'on', true);
    UPDATE greenhouse_hiring.hiring_assessment_access_recovery receipt
    SET retention_class = 'hiring_candidate_recovery', retention_expires_at = NOW(), updated_at = NOW()
    FROM greenhouse_hiring.hiring_application application
    WHERE application.candidate_facet_id = NEW.candidate_facet_id
      AND receipt.application_id = application.application_id
      AND receipt.retention_class <> 'workforce_record';
  END IF;
  RETURN NEW;
END
$$;

ALTER FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_consent() OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_consent()
  FROM PUBLIC, greenhouse_runtime;

CREATE TRIGGER trg_candidate_facet_assessment_recovery_retention
  AFTER UPDATE OF consent_status ON greenhouse_hiring.candidate_facet
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.refresh_assessment_access_recovery_retention_for_consent();

CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_access_recovery_purge_audit (
  purge_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_digest    TEXT NOT NULL CHECK (application_digest ~ '^[a-f0-9]{64}$'),
  reason_code           TEXT NOT NULL CHECK (reason_code IN ('consent_withdrawn', 'retention_expired')),
  purged_recovery_count INTEGER NOT NULL CHECK (purged_recovery_count > 0),
  executed_by           TEXT NOT NULL,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE greenhouse_hiring.hiring_assessment_access_recovery_purge_audit OWNER TO greenhouse_ops;
REVOKE ALL ON greenhouse_hiring.hiring_assessment_access_recovery_purge_audit FROM PUBLIC, greenhouse_runtime;

CREATE OR REPLACE FUNCTION greenhouse_hiring.prevent_assessment_access_recovery_purge_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'hiring_assessment_access_recovery_purge_audit es append-only (TASK-1746): % no permitido', TG_OP;
END
$$;

CREATE TRIGGER trg_hiring_assessment_access_recovery_purge_audit_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_hiring.hiring_assessment_access_recovery_purge_audit
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.prevent_assessment_access_recovery_purge_audit_mutation();

CREATE OR REPLACE FUNCTION greenhouse_hiring.purge_assessment_access_recovery(
  p_application_id text, p_reason_code text, p_actor_user_id text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, greenhouse_hiring AS $$
DECLARE
  application_stage text;
  application_decision text;
  consent_status text;
  purged_count integer;
BEGIN
  IF p_reason_code NOT IN ('consent_withdrawn', 'retention_expired') OR NULLIF(p_actor_user_id, '') IS NULL THEN
    RAISE EXCEPTION 'assessment access recovery purge input inválido' USING ERRCODE = '22023';
  END IF;

  SELECT app.stage, app.decision, facet.consent_status
    INTO application_stage, application_decision, consent_status
  FROM greenhouse_hiring.hiring_application app
  JOIN greenhouse_hiring.candidate_facet facet ON facet.candidate_facet_id = app.candidate_facet_id
  WHERE app.application_id = p_application_id FOR UPDATE;

  IF application_stage IS NULL THEN RETURN 0; END IF;
  IF p_reason_code = 'consent_withdrawn' AND consent_status <> 'withdrawn' THEN
    RAISE EXCEPTION 'candidate consent no está withdrawn' USING ERRCODE = '23514';
  END IF;
  IF p_reason_code = 'consent_withdrawn' AND (
    application_stage = 'selected' OR application_decision = 'selected'
    OR EXISTS (
      SELECT 1 FROM greenhouse_hiring.hiring_assessment_access_recovery workforce
      WHERE workforce.application_id = p_application_id
        AND workforce.retention_class = 'workforce_record')) THEN
    RAISE EXCEPTION 'workforce recovery audit uses workforce retention (TASK-1746)' USING ERRCODE = '23514';
  END IF;
  IF p_reason_code = 'retention_expired' AND NOT (
    (application_stage IN ('rejected', 'withdrawn') OR application_decision IN ('rejected', 'withdrawn'))
    AND EXISTS (
      SELECT 1 FROM greenhouse_hiring.hiring_assessment_access_recovery due
      WHERE due.application_id = p_application_id
        AND due.retention_class = 'hiring_candidate_recovery'
        AND due.retention_expires_at <= NOW())
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_hiring.hiring_assessment_access_recovery pending
      WHERE pending.application_id = p_application_id
        AND (pending.retention_class <> 'hiring_candidate_recovery'
          OR pending.retention_expires_at IS NULL OR pending.retention_expires_at > NOW()))) THEN
    RAISE EXCEPTION 'assessment access recovery retention todavía vigente' USING ERRCODE = '23514';
  END IF;

  PERFORM set_config('greenhouse.assessment_recovery_retention_purge', 'on', true);
  DELETE FROM greenhouse_hiring.hiring_assessment_access_recovery_event event
  USING greenhouse_hiring.hiring_assessment_access_recovery receipt
  WHERE event.recovery_id = receipt.recovery_id AND receipt.application_id = p_application_id;

  DELETE FROM greenhouse_hiring.hiring_assessment_access_recovery WHERE application_id = p_application_id;
  GET DIAGNOSTICS purged_count = ROW_COUNT;

  IF purged_count > 0 THEN
    INSERT INTO greenhouse_hiring.hiring_assessment_access_recovery_purge_audit
      (application_digest, reason_code, purged_recovery_count, executed_by)
    VALUES (encode(sha256(convert_to(p_application_id, 'UTF8')), 'hex'), p_reason_code, purged_count, p_actor_user_id);
  END IF;
  RETURN purged_count;
END
$$;

ALTER FUNCTION greenhouse_hiring.purge_assessment_access_recovery(text, text, text) OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_hiring.purge_assessment_access_recovery(text, text, text)
  FROM PUBLIC, greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hiring.purge_assessment_access_recovery(text, text, text) TO greenhouse_ops;

GRANT SELECT, INSERT ON greenhouse_hiring.hiring_assessment_access_recovery TO greenhouse_runtime;
GRANT UPDATE (outcome, updated_at)
  ON greenhouse_hiring.hiring_assessment_access_recovery TO greenhouse_runtime;
GRANT SELECT ON greenhouse_hiring.hiring_assessment_access_recovery_event TO greenhouse_runtime;

-- Historical bearer cleanup is intentionally NOT performed here. The repeatable sanitizer runs
-- only after every writer persists token-sensitive context redacted and recovery is live.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('hiring.assessment.recover_access_email', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1746 — Rotar el acceso de un candidate_test y despachar un email nuevo, con audit IDs-only. Role-only: EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS.', NOW(), NULL),
  ('hiring.assessment.reveal_access_link', 'hiring', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1746 — Rotar el acceso de un candidate_test y revelar una vez un enlace temporal para un canal manual verificado. Sólo humanos internos; nunca MCP, worker, app ni service principal.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions, allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description, deprecated_at = NULL;

DO $$
DECLARE seeded_count integer; trigger_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN ('hiring.assessment.recover_access_email', 'hiring.assessment.reveal_access_link')
    AND deprecated_at IS NULL;
  SELECT COUNT(*) INTO trigger_count FROM pg_trigger
  WHERE tgname IN ('trg_hiring_assessment_access_recovery_validate',
    'trg_hiring_assessment_access_recovery_final_state',
    'trg_hiring_assessment_access_recovery_update_guard',
    'trg_hiring_assessment_access_recovery_event_populate',
    'trg_hiring_assessment_access_recovery_event_append_only',
    'trg_hiring_assessment_access_recovery_event_on_insert',
    'trg_hiring_assessment_access_recovery_event_on_outcome',
    'trg_hiring_application_assessment_recovery_retention',
    'trg_candidate_facet_assessment_recovery_retention',
    'trg_hiring_assessment_access_recovery_purge_audit_append_only') AND NOT tgisinternal;
  IF seeded_count <> 2 OR trigger_count <> 10 THEN
    RAISE EXCEPTION 'TASK-1746 anti pre-up-marker check failed: capabilities=%, triggers=%', seeded_count, trigger_count;
  END IF;
END
$$;

-- Down Migration

-- Pre-rollout-only rollback. Once a recovery exists, operational rollback revokes capabilities
-- and keeps audit; it never drops history.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM greenhouse_hiring.hiring_assessment_access_recovery LIMIT 1)
     OR EXISTS (SELECT 1 FROM greenhouse_hiring.hiring_assessment_access_recovery_event LIMIT 1)
     OR EXISTS (SELECT 1 FROM greenhouse_hiring.hiring_assessment_access_recovery_purge_audit LIMIT 1) THEN
    RAISE EXCEPTION 'TASK-1746 Down blocked: recovery audit exists; revoke capabilities instead';
  END IF;
END
$$;

-- Preserve the disabled type row: Up may have found a pre-existing operator-owned
-- configuration via ON CONFLICT DO NOTHING, so Down must not delete it blindly.

UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()
WHERE capability_key IN ('hiring.assessment.recover_access_email', 'hiring.assessment.reveal_access_link')
  AND deprecated_at IS NULL;
DROP FUNCTION IF EXISTS greenhouse_hiring.purge_assessment_access_recovery(text, text, text);
DROP TRIGGER IF EXISTS trg_hiring_assessment_access_recovery_purge_audit_append_only ON greenhouse_hiring.hiring_assessment_access_recovery_purge_audit;
DROP FUNCTION IF EXISTS greenhouse_hiring.prevent_assessment_access_recovery_purge_audit_mutation();
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_access_recovery_purge_audit;
DROP TRIGGER IF EXISTS trg_candidate_facet_assessment_recovery_retention ON greenhouse_hiring.candidate_facet;
DROP FUNCTION IF EXISTS greenhouse_hiring.refresh_assessment_access_recovery_retention_for_consent();
DROP TRIGGER IF EXISTS trg_hiring_application_assessment_recovery_retention ON greenhouse_hiring.hiring_application;
DROP FUNCTION IF EXISTS greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application();
DROP TRIGGER IF EXISTS trg_hiring_assessment_access_recovery_event_on_outcome ON greenhouse_hiring.hiring_assessment_access_recovery;
DROP TRIGGER IF EXISTS trg_hiring_assessment_access_recovery_event_on_insert ON greenhouse_hiring.hiring_assessment_access_recovery;
DROP FUNCTION IF EXISTS greenhouse_hiring.emit_assessment_access_recovery_event();
DROP TRIGGER IF EXISTS trg_hiring_assessment_access_recovery_event_append_only ON greenhouse_hiring.hiring_assessment_access_recovery_event;
DROP TRIGGER IF EXISTS trg_hiring_assessment_access_recovery_event_populate ON greenhouse_hiring.hiring_assessment_access_recovery_event;
DROP FUNCTION IF EXISTS greenhouse_hiring.prevent_assessment_access_recovery_event_mutation();
DROP FUNCTION IF EXISTS greenhouse_hiring.populate_assessment_access_recovery_event();
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_access_recovery_event;
DROP TRIGGER IF EXISTS trg_hiring_assessment_access_recovery_update_guard ON greenhouse_hiring.hiring_assessment_access_recovery;
DROP TRIGGER IF EXISTS trg_hiring_assessment_access_recovery_final_state ON greenhouse_hiring.hiring_assessment_access_recovery;
DROP TRIGGER IF EXISTS trg_hiring_assessment_access_recovery_validate ON greenhouse_hiring.hiring_assessment_access_recovery;
DROP FUNCTION IF EXISTS greenhouse_hiring.validate_assessment_access_recovery_final_state();
DROP FUNCTION IF EXISTS greenhouse_hiring.guard_assessment_access_recovery_update();
DROP FUNCTION IF EXISTS greenhouse_hiring.validate_assessment_access_recovery_receipt();
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_access_recovery;
DROP FUNCTION IF EXISTS greenhouse_hiring.assessment_access_recovery_deadline(timestamptz, integer, jsonb);
