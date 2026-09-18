-- Up Migration

-- TASK-1848 Slice 2 — entrega durable por correo de ediciones emitidas (arquitectura §9).
--
-- DeliveryIntent congela la edición (su issued_hash), la modalidad, los outputs, el asunto y la
-- autorización; cada destinatario es una fila con su propio estado. El TRANSPORTE no se duplica:
-- cada destinatario referencia su fila de `greenhouse_notifications.email_deliveries` y el estado
-- del proveedor (accepted/delivered/bounced/failed) se lee de ahí.
--
--   · insight_delivery_intents     = el encargo autorizado (append-only salvo estado/cancelación)
--   · insight_delivery_recipients  = una fila por destinatario, claim atómico pending → claimed
--   · insight_delivery_events      = historial append-only redactado (sin bearer, sin email)
--
-- Dedupe duro: un destinatario no recibe dos veces la MISMA versión por la MISMA modalidad mientras
-- el envío anterior esté vivo o aceptado (índice único parcial). Reenviar tras un fallo definitivo
-- es posible; tras un resultado ambiguo exige reconciliar primero (estado `ambiguous`).

CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_delivery_intents (
  delivery_intent_id text PRIMARY KEY DEFAULT ('idlv-' || gen_random_uuid()::text),
  organization_id text NOT NULL,
  edition_id text NOT NULL,
  -- La versión autorizada: si la edición cambiara (no puede: está emitida) el hash no calzaría.
  edition_issued_hash text NOT NULL CHECK (edition_issued_hash ~ '^[0-9a-f]{64}$'),
  modality text NOT NULL CHECK (modality IN ('portal_link', 'share_link', 'attachment')),
  outputs text[] NOT NULL DEFAULT '{}'::text[],
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 200),
  message text CHECK (message IS NULL OR char_length(message) <= 2000),
  share_ttl_days integer CHECK (share_ttl_days IS NULL OR share_ttl_days BETWEEN 1 AND 90),
  -- Adjuntar es irrevocable: el intent registra que quien autorizó lo aceptó explícitamente.
  attachment_irrevocable_ack boolean NOT NULL DEFAULT false,
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'dispatching', 'completed', 'partially_failed', 'failed', 'cancelled')),
  authorized_by_actor_kind text NOT NULL CHECK (authorized_by_actor_kind IN ('member', 'client_user', 'system', 'cli')),
  authorized_by_user_id text,
  cancelled_at timestamptz,
  cancel_reason text CHECK (cancel_reason IS NULL OR cancel_reason IN ('manual', 'edition_withdrawn', 'authority_revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insight_delivery_intents_edition_fk
    FOREIGN KEY (edition_id) REFERENCES greenhouse_insights.insight_editions (edition_id),
  CONSTRAINT insight_delivery_intents_outputs_known
    CHECK (outputs <@ ARRAY['deck_pdf', 'report_pdf']::text[]),
  CONSTRAINT insight_delivery_intents_attachment_ack
    CHECK (modality <> 'attachment' OR (attachment_irrevocable_ack AND cardinality(outputs) > 0)),
  CONSTRAINT insight_delivery_intents_share_ttl
    CHECK ((modality = 'share_link') = (share_ttl_days IS NOT NULL)),
  CONSTRAINT insight_delivery_intents_cancelled_has_timestamp
    CHECK (state <> 'cancelled' OR cancelled_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS insight_delivery_intents_idempotency_uq
  ON greenhouse_insights.insight_delivery_intents (organization_id, idempotency_key);

CREATE INDEX IF NOT EXISTS insight_delivery_intents_edition_idx
  ON greenhouse_insights.insight_delivery_intents (organization_id, edition_id, created_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_delivery_recipients (
  delivery_recipient_id text PRIMARY KEY DEFAULT ('idlr-' || gen_random_uuid()::text),
  delivery_intent_id text NOT NULL,
  organization_id text NOT NULL,
  -- Denormalizados para el dedupe entre intents (misma versión + modalidad + persona).
  edition_id text NOT NULL,
  edition_issued_hash text NOT NULL,
  modality text NOT NULL,
  recipient_key text NOT NULL CHECK (recipient_key = lower(recipient_key) AND recipient_key LIKE '%@%'),
  recipient_kind text NOT NULL CHECK (recipient_kind IN ('client_user', 'internal_user')),
  recipient_user_id text NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'claimed', 'accepted', 'failed', 'ambiguous', 'skipped', 'cancelled')),
  skip_reason text CHECK (skip_reason IS NULL OR skip_reason IN (
    'duplicate_delivery', 'recipient_inactive', 'recipient_undeliverable', 'email_type_paused', 'asset_unavailable'
  )),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  email_delivery_id text,
  share_grant_id text,
  last_error_code text,
  claimed_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT insight_delivery_recipients_intent_fk
    FOREIGN KEY (delivery_intent_id) REFERENCES greenhouse_insights.insight_delivery_intents (delivery_intent_id),
  CONSTRAINT insight_delivery_recipients_share_fk
    FOREIGN KEY (share_grant_id) REFERENCES greenhouse_insights.insight_share_grants (share_grant_id),
  CONSTRAINT insight_delivery_recipients_skipped_has_reason
    CHECK ((state = 'skipped') = (skip_reason IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS insight_delivery_recipients_intent_uq
  ON greenhouse_insights.insight_delivery_recipients (delivery_intent_id, recipient_key);

-- La MISMA persona no recibe dos veces la misma versión por la misma modalidad mientras un envío
-- previo esté vivo o haya sido aceptado. `failed`/`skipped`/`cancelled` liberan el cupo.
CREATE UNIQUE INDEX IF NOT EXISTS insight_delivery_recipients_live_dedupe_uq
  ON greenhouse_insights.insight_delivery_recipients (organization_id, edition_id, edition_issued_hash, modality, recipient_key)
  WHERE state IN ('pending', 'claimed', 'accepted', 'ambiguous');

CREATE INDEX IF NOT EXISTS insight_delivery_recipients_pending_idx
  ON greenhouse_insights.insight_delivery_recipients (delivery_intent_id)
  WHERE state = 'pending';

CREATE INDEX IF NOT EXISTS insight_delivery_recipients_attention_idx
  ON greenhouse_insights.insight_delivery_recipients (state, claimed_at)
  WHERE state IN ('claimed', 'ambiguous');

CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_delivery_events (
  delivery_event_id bigserial PRIMARY KEY,
  delivery_intent_id text NOT NULL,
  delivery_recipient_id text,
  organization_id text NOT NULL,
  from_state text,
  to_state text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_kind text NOT NULL CHECK (actor_kind IN ('member', 'client_user', 'system', 'cli', 'dispatcher')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insight_delivery_events_intent_idx
  ON greenhouse_insights.insight_delivery_events (delivery_intent_id, created_at);

DROP TRIGGER IF EXISTS insight_delivery_intents_no_delete_trg ON greenhouse_insights.insight_delivery_intents;
CREATE TRIGGER insight_delivery_intents_no_delete_trg
  BEFORE DELETE ON greenhouse_insights.insight_delivery_intents
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

DROP TRIGGER IF EXISTS insight_delivery_recipients_no_delete_trg ON greenhouse_insights.insight_delivery_recipients;
CREATE TRIGGER insight_delivery_recipients_no_delete_trg
  BEFORE DELETE ON greenhouse_insights.insight_delivery_recipients
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

DROP TRIGGER IF EXISTS insight_delivery_events_no_delete_trg ON greenhouse_insights.insight_delivery_events;
CREATE TRIGGER insight_delivery_events_no_delete_trg
  BEFORE DELETE ON greenhouse_insights.insight_delivery_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

DROP TRIGGER IF EXISTS insight_delivery_events_append_only_trg ON greenhouse_insights.insight_delivery_events;
CREATE TRIGGER insight_delivery_events_append_only_trg
  BEFORE UPDATE ON greenhouse_insights.insight_delivery_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_append_only();

-- El intent autorizado es inmutable en su contenido: sólo cambian estado, cancelación y updated_at.
CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_delivery_intent_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.edition_id IS DISTINCT FROM OLD.edition_id
     OR NEW.edition_issued_hash IS DISTINCT FROM OLD.edition_issued_hash
     OR NEW.modality IS DISTINCT FROM OLD.modality
     OR NEW.outputs IS DISTINCT FROM OLD.outputs
     OR NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.share_ttl_days IS DISTINCT FROM OLD.share_ttl_days
     OR NEW.attachment_irrevocable_ack IS DISTINCT FROM OLD.attachment_irrevocable_ack
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.request_hash IS DISTINCT FROM OLD.request_hash
     OR NEW.authorized_by_actor_kind IS DISTINCT FROM OLD.authorized_by_actor_kind
     OR NEW.authorized_by_user_id IS DISTINCT FROM OLD.authorized_by_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'insight_delivery_intents: el contenido autorizado de un intent no cambia (%)', OLD.delivery_intent_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS insight_delivery_intents_immutable_trg ON greenhouse_insights.insight_delivery_intents;
CREATE TRIGGER insight_delivery_intents_immutable_trg
  BEFORE UPDATE ON greenhouse_insights.insight_delivery_intents
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_delivery_intent_immutable();

-- Correlación token-sensitive del correo con ShareGrant: el índice único de intents de la
-- plataforma de correo pasa a cubrir el EmailType de Insights (claim atómico por destinatario).
DROP INDEX IF EXISTS greenhouse_notifications.uq_email_deliveries_token_intent_v3;
CREATE UNIQUE INDEX uq_email_deliveries_token_intent_v3
  ON greenhouse_notifications.email_deliveries (email_type, source_event_id, source_entity)
  WHERE email_type = ANY (ARRAY[
      'hiring_assessment_assigned'::text,
      'hiring_assessment_access_recovery'::text,
      'hiring_talent_pool_verification'::text,
      'insights_edition_delivery'::text
    ])
    AND source_event_id IS NOT NULL
    AND source_entity IS NOT NULL;
DROP INDEX IF EXISTS greenhouse_notifications.uq_email_deliveries_token_intent_v2;

-- Kill switch: los dos EmailTypes nacen APAGADOS. `email_type_config` falla abierto si falta la
-- fila, así que sembrarla en false es lo que impide que el deploy los encienda solo.
INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled, paused_reason, paused_by, updated_at)
VALUES
  ('insights_edition_delivery', FALSE, 'TASK-1848: nace apagado; se enciende con el rollout de delivery', 'migration:task-1848', NOW()),
  ('insights_edition_delivery_attachment', FALSE, 'TASK-1848: nace apagado; se enciende con el rollout de delivery', 'migration:task-1848', NOW())
ON CONFLICT (email_type) DO NOTHING;

-- Capability de envío corporativo: distinta de compartir. Sólo internos (sin scope `own`): un
-- cliente puede compartir un enlace, nunca usar el sender de Efeonce como relay (§7.1/§9).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('insights.delivery.send', 'insights', ARRAY['create', 'read', 'update'], ARRAY['organization', 'tenant'],
   'Solicitar, consultar, reconciliar y cancelar envíos por correo desde Efeonce de ediciones emitidas; sólo internos', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

DO $$
DECLARE missing text := '';
BEGIN
  IF to_regclass('greenhouse_insights.insight_delivery_intents') IS NULL THEN missing := missing || ' intents'; END IF;
  IF to_regclass('greenhouse_insights.insight_delivery_recipients') IS NULL THEN missing := missing || ' recipients'; END IF;
  IF to_regclass('greenhouse_insights.insight_delivery_events') IS NULL THEN missing := missing || ' events'; END IF;
  IF to_regclass('greenhouse_insights.insight_delivery_recipients_live_dedupe_uq') IS NULL THEN missing := missing || ' live_dedupe_uq'; END IF;
  IF to_regclass('greenhouse_notifications.uq_email_deliveries_token_intent_v3') IS NULL THEN missing := missing || ' token_intent_v3'; END IF;
  IF (SELECT count(*) FROM greenhouse_notifications.email_type_config
      WHERE email_type IN ('insights_edition_delivery', 'insights_edition_delivery_attachment')) <> 2 THEN
    missing := missing || ' email_type_config_seed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'insights.delivery.send' AND deprecated_at IS NULL) THEN missing := missing || ' capability'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1848 anti pre-up-marker check: faltan objetos:%', missing;
  END IF;
END
$$;

ALTER TABLE greenhouse_insights.insight_delivery_intents OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_insights.insight_delivery_recipients OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_insights.insight_delivery_events OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_delivery_intents TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_delivery_recipients TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_insights.insight_delivery_events TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_insights.insight_delivery_events_delivery_event_id_seq TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_insights.insight_delivery_intents,
  greenhouse_insights.insight_delivery_recipients, greenhouse_insights.insight_delivery_events TO greenhouse_migrator_user;

-- Down Migration

-- SOLO undo. Con envíos reales, forward-fix (el historial de distribución no se reescribe).
-- El seed de email_type_config NO se borra: borrar la fila ENCENDERÍA el tipo (falla abierto).
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_deliveries_token_intent_v2
  ON greenhouse_notifications.email_deliveries (email_type, source_event_id, source_entity)
  WHERE email_type = ANY (ARRAY[
      'hiring_assessment_assigned'::text,
      'hiring_assessment_access_recovery'::text,
      'hiring_talent_pool_verification'::text
    ])
    AND source_event_id IS NOT NULL
    AND source_entity IS NOT NULL;
DROP INDEX IF EXISTS greenhouse_notifications.uq_email_deliveries_token_intent_v3;
DROP TRIGGER IF EXISTS insight_delivery_intents_immutable_trg ON greenhouse_insights.insight_delivery_intents;
DROP TRIGGER IF EXISTS insight_delivery_events_append_only_trg ON greenhouse_insights.insight_delivery_events;
DROP TRIGGER IF EXISTS insight_delivery_events_no_delete_trg ON greenhouse_insights.insight_delivery_events;
DROP TRIGGER IF EXISTS insight_delivery_recipients_no_delete_trg ON greenhouse_insights.insight_delivery_recipients;
DROP TRIGGER IF EXISTS insight_delivery_intents_no_delete_trg ON greenhouse_insights.insight_delivery_intents;
DROP TABLE IF EXISTS greenhouse_insights.insight_delivery_events;
DROP TABLE IF EXISTS greenhouse_insights.insight_delivery_recipients;
DROP TABLE IF EXISTS greenhouse_insights.insight_delivery_intents;
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_delivery_intent_immutable();
UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW() WHERE capability_key = 'insights.delivery.send';
