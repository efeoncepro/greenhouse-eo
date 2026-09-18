-- Up Migration

-- TASK-1848 Slice 1 — ShareGrant de Efeonce Insights (arquitectura §4 y §8).
--
-- Un grant = un enlace de lectura a UNA edición emitida de audiencia cliente. Muchos por edición,
-- revocación individual, expiración obligatoria. Del token sólo se persiste su sha256: el bearer
-- se muestra una vez al crearlo y NUNCA es recuperable (decisión del operador 2026-09-18: ni
-- siquiera cifrado; un reintento de envío revoca el grant y emite uno nuevo).
--
-- Tres tablas:
--   · insight_share_grants         = el grant (estado derivado: revoked_at / expires_at)
--   · insight_share_access_events  = accesos mínimos append-only (nunca prueba de lectura humana)
--   · insight_share_rate_buckets   = ventana por minuto por sujeto hasheado (IP o grant), atómica

CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_share_grants (
  share_grant_id text PRIMARY KEY DEFAULT ('ishr-' || gen_random_uuid()::text),
  organization_id text NOT NULL,
  edition_id text NOT NULL,
  -- Sólo se comparte lo que el cliente ya puede ver: una edición interna jamás sale por enlace.
  audience text NOT NULL DEFAULT 'client' CHECK (audience = 'client'),
  token_digest text NOT NULL CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  -- Outputs descargables por este enlace (subconjunto de los de la edición); vacío = sólo lectura web.
  download_outputs text[] NOT NULL DEFAULT '{}'::text[],
  label text CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 120),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'delivery')),
  expires_at timestamptz NOT NULL,
  created_by_actor_kind text NOT NULL CHECK (created_by_actor_kind IN ('member', 'client_user', 'system', 'cli')),
  created_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by_actor_kind text CHECK (revoked_by_actor_kind IS NULL OR revoked_by_actor_kind IN ('member', 'client_user', 'system', 'cli')),
  revoked_by_user_id text,
  revoke_reason text CHECK (revoke_reason IS NULL OR revoke_reason IN (
    'manual', 'edition_withdrawn', 'delivery_superseded', 'delivery_failed', 'authority_revoked'
  )),
  CONSTRAINT insight_share_grants_edition_fk
    FOREIGN KEY (edition_id) REFERENCES greenhouse_insights.insight_editions (edition_id),
  -- Expiración obligatoria y acotada: máximo inicial 90 días (policy §8). Configurable por policy,
  -- nunca por el caller; ampliar el techo es otra migración, no un parámetro.
  CONSTRAINT insight_share_grants_expiry_window
    CHECK (expires_at > created_at AND expires_at <= created_at + interval '90 days'),
  CONSTRAINT insight_share_grants_download_outputs_known
    CHECK (download_outputs <@ ARRAY['deck_pdf', 'report_pdf', 'web']::text[]),
  CONSTRAINT insight_share_grants_revocation_complete
    CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL) AND (revoked_at IS NULL OR revoked_by_actor_kind IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS insight_share_grants_token_digest_uq
  ON greenhouse_insights.insight_share_grants (token_digest);

CREATE INDEX IF NOT EXISTS insight_share_grants_edition_idx
  ON greenhouse_insights.insight_share_grants (organization_id, edition_id, created_at DESC);

-- Un grant es inmutable salvo su revocación, que ocurre una sola vez y nunca se deshace:
-- un token revocado no se reactiva (arquitectura §4, ciclo `active → revoked | expired`).
CREATE OR REPLACE FUNCTION greenhouse_insights.assert_insight_share_grant_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.share_grant_id IS DISTINCT FROM OLD.share_grant_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.edition_id IS DISTINCT FROM OLD.edition_id
     OR NEW.audience IS DISTINCT FROM OLD.audience
     OR NEW.token_digest IS DISTINCT FROM OLD.token_digest
     OR NEW.download_outputs IS DISTINCT FROM OLD.download_outputs
     OR NEW.label IS DISTINCT FROM OLD.label
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_by_actor_kind IS DISTINCT FROM OLD.created_by_actor_kind
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'insight_share_grants: sólo la revocación puede cambiar un grant (%)', OLD.share_grant_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'insight_share_grants: un grant revocado no se modifica ni se reactiva (%)', OLD.share_grant_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS insight_share_grants_immutable_trg ON greenhouse_insights.insight_share_grants;
CREATE TRIGGER insight_share_grants_immutable_trg
  BEFORE UPDATE ON greenhouse_insights.insight_share_grants
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insight_share_grant_immutable();

DROP TRIGGER IF EXISTS insight_share_grants_no_delete_trg ON greenhouse_insights.insight_share_grants;
CREATE TRIGGER insight_share_grants_no_delete_trg
  BEFORE DELETE ON greenhouse_insights.insight_share_grants
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_no_delete();

-- Accesos mínimos (§8): qué grant, qué tipo de acceso, qué resultado y una pista de robot/prefetch.
-- Sin token, sin IP cruda (sólo hash salado truncado), sin user-agent completo. Un hit NO es una
-- persona leyendo: jamás se usa como prueba de lectura o engagement. Retención acotada: la purga
-- periódica corre en el tick de Insights (Slice 3); la tabla es append-only para todo lo demás.
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_share_access_events (
  access_event_id bigserial PRIMARY KEY,
  share_grant_id text,
  organization_id text,
  edition_id text,
  access_kind text NOT NULL CHECK (access_kind IN ('view', 'download')),
  outcome text NOT NULL CHECK (outcome IN ('served', 'not_found', 'revoked', 'expired', 'withdrawn', 'unavailable', 'rate_limited')),
  output text CHECK (output IS NULL OR output IN ('deck_pdf', 'report_pdf', 'web')),
  client_hint text NOT NULL DEFAULT 'unknown' CHECK (client_hint IN ('unknown', 'robot', 'prefetch')),
  subject_hash text CHECK (subject_hash IS NULL OR subject_hash ~ '^[0-9a-f]{32}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insight_share_access_events_grant_idx
  ON greenhouse_insights.insight_share_access_events (share_grant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS insight_share_access_events_created_idx
  ON greenhouse_insights.insight_share_access_events (created_at);

DROP TRIGGER IF EXISTS insight_share_access_events_append_only_trg ON greenhouse_insights.insight_share_access_events;
CREATE TRIGGER insight_share_access_events_append_only_trg
  BEFORE UPDATE ON greenhouse_insights.insight_share_access_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_insights.assert_insights_append_only();

-- Rate limit del reader público: una fila por (sujeto hasheado, acción); ventana de un minuto
-- reiniciada en el mismo UPSERT (patrón TASK-1724, falla cerrado en el consumidor).
CREATE TABLE IF NOT EXISTS greenhouse_insights.insight_share_rate_buckets (
  subject_hash text NOT NULL CHECK (subject_hash ~ '^[0-9a-f]{32}$'),
  action text NOT NULL CHECK (action IN ('view', 'download')),
  window_started_at timestamptz NOT NULL,
  hit_count integer NOT NULL CHECK (hit_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_hash, action)
);

-- Capability de sharing: crear, listar y revocar enlaces de ediciones elegibles. Distinta de emitir
-- y de enviar desde Efeonce (§7.1): un cliente puede compartir sólo con esta capability explícita.
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('insights.share.manage', 'insights', ARRAY['create', 'read', 'update'], ARRAY['own', 'organization', 'tenant'],
   'Crear, listar y revocar enlaces compartidos (ShareGrant) de ediciones emitidas de audiencia cliente; no emite ni envía correo', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

-- Anti pre-up-marker (TASK-768 / ISSUE-068).
DO $$
DECLARE missing text := '';
BEGIN
  IF to_regclass('greenhouse_insights.insight_share_grants') IS NULL THEN missing := missing || ' insight_share_grants'; END IF;
  IF to_regclass('greenhouse_insights.insight_share_access_events') IS NULL THEN missing := missing || ' insight_share_access_events'; END IF;
  IF to_regclass('greenhouse_insights.insight_share_rate_buckets') IS NULL THEN missing := missing || ' insight_share_rate_buckets'; END IF;
  IF to_regclass('greenhouse_insights.insight_share_grants_token_digest_uq') IS NULL THEN missing := missing || ' token_digest_uq'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'insight_share_grants_immutable_trg') THEN missing := missing || ' immutable_trg'; END IF;
  IF NOT EXISTS (SELECT 1 FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'insights.share.manage' AND deprecated_at IS NULL) THEN missing := missing || ' capability'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'TASK-1848 anti pre-up-marker check: faltan objetos:%', missing;
  END IF;
END
$$;

ALTER TABLE greenhouse_insights.insight_share_grants OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_insights.insight_share_access_events OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_insights.insight_share_rate_buckets OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_insights.insight_share_grants TO greenhouse_runtime;
GRANT SELECT, INSERT, DELETE ON greenhouse_insights.insight_share_access_events TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_insights.insight_share_access_events_access_event_id_seq TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_insights.insight_share_rate_buckets TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_insights.insight_share_grants,
  greenhouse_insights.insight_share_access_events, greenhouse_insights.insight_share_rate_buckets TO greenhouse_migrator_user;

-- Down Migration

-- SOLO undo. Con grants reales entregados, forward-fix: retirar la tabla corta enlaces vivos.
DROP TRIGGER IF EXISTS insight_share_access_events_append_only_trg ON greenhouse_insights.insight_share_access_events;
DROP TRIGGER IF EXISTS insight_share_grants_no_delete_trg ON greenhouse_insights.insight_share_grants;
DROP TRIGGER IF EXISTS insight_share_grants_immutable_trg ON greenhouse_insights.insight_share_grants;
DROP TABLE IF EXISTS greenhouse_insights.insight_share_rate_buckets;
DROP TABLE IF EXISTS greenhouse_insights.insight_share_access_events;
DROP TABLE IF EXISTS greenhouse_insights.insight_share_grants;
DROP FUNCTION IF EXISTS greenhouse_insights.assert_insight_share_grant_immutable();
UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW() WHERE capability_key = 'insights.share.manage';
