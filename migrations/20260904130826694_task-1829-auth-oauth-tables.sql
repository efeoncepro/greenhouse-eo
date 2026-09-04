-- Up Migration

-- TASK-1829 — Superficie OAuth del authorization server propio de Efeonce (EPIC-044).
--
-- Additive-only sobre el schema `greenhouse_auth` (TASK-1828). Siete tablas:
--   oauth_clients        registro de clientes (CIMD = client_id URL, DCR, pre-registrados)
--   cimd_cache           documentos CIMD validados/rechazados con TTL
--   authorization_codes  codes de un solo uso (sólo hash), PKCE S256 obligatorio
--   refresh_tokens       refresh opacos rotativos por familia (`grant_id`)
--   access_tokens        registro de `jti` para revocación e introspección (el token es un JWT ES256)
--   client_consents      consentimiento por (subject, environment, client, scope), revocable
--   oauth_audit_events   audit append-only del protocolo; base del rate limit por IP/cliente
--
-- Invariantes que sostiene el DDL: un code se consume una vez (fila única por hash + `consumed_at`);
-- la familia de refresh se identifica por `grant_id`; un consent activo es único por tupla; el audit
-- no admite UPDATE/DELETE. Ningún token, code ni secret se guarda en claro (sólo sha256).

CREATE TABLE IF NOT EXISTS greenhouse_auth.oauth_clients (
  client_id                   TEXT PRIMARY KEY,
  registration_kind           TEXT NOT NULL
    CONSTRAINT oauth_clients_registration_kind_check
    CHECK (registration_kind IN ('cimd', 'dcr', 'preregistered')),
  client_type                 TEXT NOT NULL
    CONSTRAINT oauth_clients_client_type_check CHECK (client_type IN ('public', 'confidential')),
  client_name                 TEXT NOT NULL,
  redirect_uris               TEXT[] NOT NULL
    CONSTRAINT oauth_clients_redirect_uris_check
    CHECK (cardinality(redirect_uris) > 0 AND array_to_string(redirect_uris, ' ') NOT LIKE '%*%'),
  grant_types                 TEXT[] NOT NULL
    CONSTRAINT oauth_clients_grant_types_check CHECK (cardinality(grant_types) > 0),
  response_types              TEXT[] NOT NULL
    CONSTRAINT oauth_clients_response_types_check CHECK (cardinality(response_types) > 0),
  token_endpoint_auth_method  TEXT NOT NULL
    CONSTRAINT oauth_clients_token_auth_method_check
    CHECK (token_endpoint_auth_method IN ('none', 'client_secret_basic', 'client_secret_post')),
  client_secret_hash          TEXT,
  allowed_scopes              TEXT[],
  status                      TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT oauth_clients_status_check CHECK (status IN ('active', 'suspended', 'retired')),
  metadata_json               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by                  TEXT NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Público ⇔ sin secret y `none`; confidencial ⇔ con secret hasheado y método distinto de `none`.
  CONSTRAINT oauth_clients_secret_posture_check CHECK (
    (client_type = 'public' AND token_endpoint_auth_method = 'none' AND client_secret_hash IS NULL) OR
    (client_type = 'confidential' AND token_endpoint_auth_method <> 'none' AND client_secret_hash IS NOT NULL)
  ),
  -- CIMD: el client_id ES la URL https del documento.
  CONSTRAINT oauth_clients_cimd_client_id_check CHECK (registration_kind <> 'cimd' OR client_id LIKE 'https://%')
);

CREATE INDEX IF NOT EXISTS oauth_clients_kind_status_idx
  ON greenhouse_auth.oauth_clients (registration_kind, status);

CREATE TABLE IF NOT EXISTS greenhouse_auth.cimd_cache (
  client_id_url   TEXT PRIMARY KEY
    CONSTRAINT cimd_cache_https_check CHECK (client_id_url LIKE 'https://%'),
  document        JSONB,
  etag            TEXT,
  status          TEXT NOT NULL
    CONSTRAINT cimd_cache_status_check CHECK (status IN ('valid', 'rejected')),
  reject_reason   TEXT,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  CONSTRAINT cimd_cache_shape_check CHECK (
    (status = 'valid' AND document IS NOT NULL AND reject_reason IS NULL) OR
    (status = 'rejected' AND reject_reason IS NOT NULL)
  ),
  CONSTRAINT cimd_cache_ttl_check CHECK (expires_at > fetched_at AND expires_at <= fetched_at + INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS greenhouse_auth.authorization_codes (
  code_hash               TEXT PRIMARY KEY,
  client_id               TEXT NOT NULL
    CONSTRAINT authorization_codes_client_fkey REFERENCES greenhouse_auth.oauth_clients (client_id) ON DELETE RESTRICT,
  subject                 TEXT NOT NULL,
  environment_id          TEXT NOT NULL,
  grant_id                TEXT NOT NULL,
  redirect_uri            TEXT NOT NULL,
  scopes                  TEXT[] NOT NULL
    CONSTRAINT authorization_codes_scopes_check CHECK (cardinality(scopes) > 0),
  code_challenge          TEXT NOT NULL,
  code_challenge_method   TEXT NOT NULL DEFAULT 'S256'
    CONSTRAINT authorization_codes_pkce_method_check CHECK (code_challenge_method = 'S256'),
  nonce                   TEXT,
  auth_time               TIMESTAMPTZ NOT NULL,
  grants_version          INTEGER NOT NULL
    CONSTRAINT authorization_codes_grants_version_check CHECK (grants_version >= 1),
  expires_at              TIMESTAMPTZ NOT NULL,
  consumed_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash                 TEXT,
  correlation_id          TEXT,
  CONSTRAINT authorization_codes_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS authorization_codes_client_created_idx
  ON greenhouse_auth.authorization_codes (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS authorization_codes_grant_idx
  ON greenhouse_auth.authorization_codes (grant_id);
CREATE INDEX IF NOT EXISTS authorization_codes_pending_expiry_idx
  ON greenhouse_auth.authorization_codes (expires_at) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS greenhouse_auth.refresh_tokens (
  token_hash            TEXT PRIMARY KEY,
  grant_id              TEXT NOT NULL,
  client_id             TEXT NOT NULL
    CONSTRAINT refresh_tokens_client_fkey REFERENCES greenhouse_auth.oauth_clients (client_id) ON DELETE RESTRICT,
  subject               TEXT NOT NULL,
  environment_id        TEXT NOT NULL,
  scopes                TEXT[] NOT NULL
    CONSTRAINT refresh_tokens_scopes_check CHECK (cardinality(scopes) > 0),
  status                TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT refresh_tokens_status_check CHECK (status IN ('active', 'rotated', 'revoked')),
  rotated_to_hash       TEXT,
  expires_at            TIMESTAMPTZ NOT NULL,
  absolute_expires_at   TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at               TIMESTAMPTZ,
  revoked_at            TIMESTAMPTZ,
  revoke_reason         TEXT,
  CONSTRAINT refresh_tokens_expiry_check CHECK (expires_at > created_at AND absolute_expires_at > created_at),
  CONSTRAINT refresh_tokens_lifecycle_check CHECK (
    (status = 'active'  AND rotated_to_hash IS NULL     AND revoked_at IS NULL) OR
    (status = 'rotated' AND rotated_to_hash IS NOT NULL AND revoked_at IS NULL) OR
    (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS refresh_tokens_grant_idx
  ON greenhouse_auth.refresh_tokens (grant_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_subject_client_idx
  ON greenhouse_auth.refresh_tokens (environment_id, subject, client_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_active_expiry_idx
  ON greenhouse_auth.refresh_tokens (expires_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS greenhouse_auth.access_tokens (
  jti             TEXT PRIMARY KEY,
  grant_id        TEXT NOT NULL,
  client_id       TEXT NOT NULL
    CONSTRAINT access_tokens_client_fkey REFERENCES greenhouse_auth.oauth_clients (client_id) ON DELETE RESTRICT,
  subject         TEXT NOT NULL,
  environment_id  TEXT NOT NULL,
  scopes          TEXT[] NOT NULL
    CONSTRAINT access_tokens_scopes_check CHECK (cardinality(scopes) > 0),
  issued_at       TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  revoke_reason   TEXT,
  CONSTRAINT access_tokens_expiry_check CHECK (expires_at > issued_at)
);

CREATE INDEX IF NOT EXISTS access_tokens_grant_idx
  ON greenhouse_auth.access_tokens (grant_id);
CREATE INDEX IF NOT EXISTS access_tokens_subject_client_idx
  ON greenhouse_auth.access_tokens (environment_id, subject, client_id);
CREATE INDEX IF NOT EXISTS access_tokens_expiry_idx
  ON greenhouse_auth.access_tokens (expires_at);

CREATE TABLE IF NOT EXISTS greenhouse_auth.client_consents (
  consent_id      TEXT PRIMARY KEY DEFAULT ('cst-' || gen_random_uuid()::text),
  subject         TEXT NOT NULL,
  environment_id  TEXT NOT NULL,
  client_id       TEXT NOT NULL
    CONSTRAINT client_consents_client_fkey REFERENCES greenhouse_auth.oauth_clients (client_id) ON DELETE RESTRICT,
  scope           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT client_consents_status_check CHECK (status IN ('active', 'revoked')),
  granted_via     TEXT NOT NULL,
  granted_by      TEXT NOT NULL,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  revoked_by      TEXT,
  revoke_reason   TEXT,
  CONSTRAINT client_consents_lifecycle_check CHECK (
    (status = 'active'  AND revoked_at IS NULL) OR
    (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  )
);

-- Un consentimiento activo por tupla: la idempotencia del command se apoya en este índice.
CREATE UNIQUE INDEX IF NOT EXISTS client_consents_active_uidx
  ON greenhouse_auth.client_consents (environment_id, subject, client_id, scope)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS client_consents_client_idx
  ON greenhouse_auth.client_consents (client_id, status);

CREATE TABLE IF NOT EXISTS greenhouse_auth.oauth_audit_events (
  event_id          TEXT PRIMARY KEY DEFAULT ('oae-' || gen_random_uuid()::text),
  event_type        TEXT NOT NULL
    CONSTRAINT oauth_audit_events_type_check CHECK (event_type IN (
      'authorize', 'token', 'refresh', 'revoke', 'introspect', 'register', 'cimd_fetch',
      'consent_granted', 'consent_revoked', 'code_reuse', 'refresh_reuse', 'rate_limited'
    )),
  outcome           TEXT NOT NULL
    CONSTRAINT oauth_audit_events_outcome_check CHECK (outcome IN ('success', 'rejected', 'failure')),
  client_id         TEXT,
  subject_hash      TEXT,
  grant_id          TEXT,
  error_code        TEXT,
  ip_hash           TEXT,
  user_agent_hash   TEXT,
  correlation_id    TEXT,
  details           JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oauth_audit_events_type_occurred_idx
  ON greenhouse_auth.oauth_audit_events (event_type, outcome, occurred_at DESC);
CREATE INDEX IF NOT EXISTS oauth_audit_events_ip_occurred_idx
  ON greenhouse_auth.oauth_audit_events (ip_hash, occurred_at DESC) WHERE ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS oauth_audit_events_client_occurred_idx
  ON greenhouse_auth.oauth_audit_events (client_id, occurred_at DESC) WHERE client_id IS NOT NULL;

-- updated_at de clientes (función de TASK-1828).
DROP TRIGGER IF EXISTS trg_oauth_clients_touch_updated_at ON greenhouse_auth.oauth_clients;
CREATE TRIGGER trg_oauth_clients_touch_updated_at
  BEFORE UPDATE ON greenhouse_auth.oauth_clients
  FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.touch_updated_at();

-- Audit append-only.
CREATE OR REPLACE FUNCTION greenhouse_auth.block_oauth_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_auth.oauth_audit_events is append-only (TASK-1829)';
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_oauth_audit_events_append_only ON greenhouse_auth.oauth_audit_events;
CREATE TRIGGER trg_oauth_audit_events_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_auth.oauth_audit_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.block_oauth_audit_mutation();

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si los objetos no quedaron creados.
DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_auth'
    AND table_name IN (
      'oauth_clients', 'cimd_cache', 'authorization_codes', 'refresh_tokens',
      'access_tokens', 'client_consents', 'oauth_audit_events'
    );

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'greenhouse_auth'
    AND indexname = 'client_consents_active_uidx';

  IF table_count <> 7 OR index_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1829 anti pre-up-marker: expected 7 greenhouse_auth OAuth tables and the active-consent index, got tables=% indexes=%. Markers may be inverted.', table_count, index_count;
  END IF;
END
$$;

-- Ownership + GRANTs (runtime Cloud Run = greenhouse_app; portal = greenhouse_runtime).
ALTER TABLE greenhouse_auth.oauth_clients OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.cimd_cache OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.authorization_codes OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.refresh_tokens OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.access_tokens OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.client_consents OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.oauth_audit_events OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_auth.block_oauth_audit_mutation() OWNER TO greenhouse_ops;

-- Registro, cache y consents: nunca DELETE desde runtime (supersede / revoke).
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.oauth_clients TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.cimd_cache TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.client_consents TO greenhouse_runtime, greenhouse_app;

-- Codes y tokens: DELETE sólo para la limpieza de filas expiradas (command `oauth-gc`).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.authorization_codes TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.refresh_tokens TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.access_tokens TO greenhouse_runtime, greenhouse_app;

-- Audit: sólo INSERT/SELECT (el trigger bloquea UPDATE/DELETE aunque el GRANT exista).
GRANT SELECT, INSERT ON greenhouse_auth.oauth_audit_events TO greenhouse_runtime, greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_auth TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_auth.block_oauth_audit_mutation() TO greenhouse_runtime, greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_auth.oauth_audit_events;
DROP TABLE IF EXISTS greenhouse_auth.client_consents;
DROP TABLE IF EXISTS greenhouse_auth.access_tokens;
DROP TABLE IF EXISTS greenhouse_auth.refresh_tokens;
DROP TABLE IF EXISTS greenhouse_auth.authorization_codes;
DROP TABLE IF EXISTS greenhouse_auth.cimd_cache;
DROP TABLE IF EXISTS greenhouse_auth.oauth_clients;
DROP FUNCTION IF EXISTS greenhouse_auth.block_oauth_audit_mutation();
