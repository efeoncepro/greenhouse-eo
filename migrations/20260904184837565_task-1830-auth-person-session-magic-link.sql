-- Up Migration

-- TASK-1830 Slice 1 — Sesión propia del emisor + magic link + anti-abuso (EPIC-044).
--
-- Additive-only sobre `greenhouse_auth` (TASK-1828 llaves, TASK-1829 OAuth). Cuatro tablas:
--   sessions              sesión de persona externa (cookie `__Host-efeonce_auth`; sólo sha256 del id)
--   magic_link_tokens     enlaces de un solo uso, 15 min, sólo sha256 del verificador
--   auth_rate_limits      bucket contado por llave hasheada + bloqueo progresivo (`locked_until`)
--   person_auth_attempts  ledger append-only de intentos de autenticación de PERSONA
--
-- Por qué `person_auth_attempts` y no `greenhouse_serving.auth_attempts` (ledger TASK-742): ese ledger
-- es del portal y no acepta a este runtime sin romperlo — `provider` tiene CHECK cerrado en
-- (credentials, azure-ad, google, magic-link) sin passkey ni TOTP, `stage` enumera callbacks de
-- NextAuth, `user_id_resolved` es del espacio de `client_users` (otro espacio de sujetos) y su GRANT de
-- INSERT es sólo para `greenhouse_runtime`, mientras el emisor conecta como `greenhouse_app`. El ADR
-- nativo aísla el RUNTIME del emisor (sesión, secretos, cookie) aunque la IDENTIDAD converja en
-- `identity_profiles`: el ledger de intentos es estado de runtime. Tampoco va en `oauth_audit_events`:
-- ese enum describe el protocolo y su `subject_hash` NO está indexado, así que un bloqueo progresivo por
-- sujeto sería un scan. Referencia cruzada en GREENHOUSE_AUTH_RESILIENCE_V1.md.
--
-- Invariantes que sostiene el DDL: una sesión referencia exactamente UN source link (FK real) y muere
-- cuando ese link deja de estar activo (chequeo por request en el resolver); un magic link se consume una
-- sola vez (`consumed_at` + UPDATE con rowCount 1 dentro de tx); ningún token, verificador, correo ni IP
-- se guarda en claro (sólo sha256); el ledger no admite UPDATE ni DELETE.

-- ─── Sesiones ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_auth.sessions (
  session_hash          TEXT PRIMARY KEY
    CONSTRAINT sessions_hash_shape_check CHECK (session_hash ~ '^[0-9a-f]{64}$'),
  subject               TEXT NOT NULL,
  environment_id        TEXT NOT NULL,
  profile_id            TEXT NOT NULL,
  -- El link es la única prueba de que esta persona sigue ligada al Account 360. FK real:
  -- una sesión NUNCA puede apuntar a un link inexistente.
  link_id               TEXT NOT NULL
    REFERENCES greenhouse_core.identity_profile_source_links (link_id) ON DELETE RESTRICT,
  -- `amr` sale de los flags REALES del factor (uv de la aserción WebAuthn, verificación TOTP),
  -- nunca de lo que declare el cliente. Es lo que decide el step-up de los scopes de escritura.
  amr                   TEXT[] NOT NULL
    CONSTRAINT sessions_amr_not_empty_check CHECK (cardinality(amr) > 0),
  auth_time             TIMESTAMPTZ NOT NULL,
  step_up_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Deslizante (12 h) acotada por el tope absoluto (7 d).
  expires_at            TIMESTAMPTZ NOT NULL,
  absolute_expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at            TIMESTAMPTZ,
  revoke_reason         TEXT,
  ip_hash               TEXT,
  user_agent_hash       TEXT,
  correlation_id        TEXT,
  CONSTRAINT sessions_absolute_after_created_check CHECK (absolute_expires_at > created_at),
  CONSTRAINT sessions_sliding_within_absolute_check CHECK (expires_at <= absolute_expires_at),
  CONSTRAINT sessions_revoke_consistency_check CHECK (
    (revoked_at IS NULL AND revoke_reason IS NULL) OR (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS sessions_subject_live_idx
  ON greenhouse_auth.sessions (environment_id, subject, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS sessions_link_live_idx
  ON greenhouse_auth.sessions (link_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS sessions_expiry_idx
  ON greenhouse_auth.sessions (absolute_expires_at)
  WHERE revoked_at IS NULL;

-- ─── Magic link ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_auth.magic_link_tokens (
  -- Selector público: viaja en la URL y permite buscar por PK. El verificador NUNCA se busca.
  token_id              UUID PRIMARY KEY,
  token_hash            TEXT NOT NULL
    CONSTRAINT magic_link_tokens_hash_shape_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  environment_id        TEXT NOT NULL,
  subject               TEXT NOT NULL,
  -- El correo NUNCA se persiste en claro acá: sólo su sha256, para cooldown y forense.
  email_hash            TEXT NOT NULL
    CONSTRAINT magic_link_tokens_email_hash_shape_check CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  -- Path + query del `authorize` original al que se vuelve; sólo mismo origen (validado en runtime).
  return_to             TEXT,
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at            TIMESTAMPTZ NOT NULL,
  consumed_at           TIMESTAMPTZ,
  requested_ip_hash     TEXT,
  consumed_ip_hash      TEXT,
  user_agent_hash       TEXT,
  correlation_id        TEXT,
  CONSTRAINT magic_link_tokens_expires_after_request_check CHECK (expires_at > requested_at),
  CONSTRAINT magic_link_tokens_consumed_after_request_check CHECK (consumed_at IS NULL OR consumed_at >= requested_at),
  CONSTRAINT magic_link_tokens_return_to_relative_check CHECK (return_to IS NULL OR return_to LIKE '/%')
);

CREATE INDEX IF NOT EXISTS magic_link_tokens_subject_recent_idx
  ON greenhouse_auth.magic_link_tokens (environment_id, subject, requested_at DESC);

CREATE INDEX IF NOT EXISTS magic_link_tokens_open_idx
  ON greenhouse_auth.magic_link_tokens (expires_at)
  WHERE consumed_at IS NULL;

-- ─── Rate limit + bloqueo progresivo ─────────────────────────────────────────
--
-- Una fila por llave (`<acción>:<dimensión>:<sha256>`), upsert atómico O(1). El bloqueo NO se puede
-- derivar contando el ledger: tiene que sobrevivir aunque los intentos paren, y eso es estado.

CREATE TABLE IF NOT EXISTS greenhouse_auth.auth_rate_limits (
  bucket_key            TEXT PRIMARY KEY
    CONSTRAINT auth_rate_limits_key_shape_check CHECK (bucket_key ~ '^[a-z_]+:(ip|subject|email):[0-9a-f]{64}$'),
  window_started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count             INTEGER NOT NULL DEFAULT 0
    CONSTRAINT auth_rate_limits_hit_count_check CHECK (hit_count >= 0),
  -- Bloqueos consecutivos: el backoff crece con este número, no con la ventana.
  lockout_count         INTEGER NOT NULL DEFAULT 0
    CONSTRAINT auth_rate_limits_lockout_count_check CHECK (lockout_count >= 0),
  locked_until          TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_locked_idx
  ON greenhouse_auth.auth_rate_limits (locked_until)
  WHERE locked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS auth_rate_limits_stale_idx
  ON greenhouse_auth.auth_rate_limits (updated_at);

-- ─── Ledger append-only de intentos de persona ───────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_auth.person_auth_attempts (
  attempt_id            TEXT PRIMARY KEY DEFAULT ('paa-' || gen_random_uuid()::text),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  method                TEXT NOT NULL
    CONSTRAINT person_auth_attempts_method_check
    CHECK (method IN ('magic_link', 'passkey', 'totp', 'invitation', 'session', 'recovery')),
  stage                 TEXT NOT NULL
    CONSTRAINT person_auth_attempts_stage_check
    CHECK (stage IN ('request', 'consume', 'register', 'authenticate', 'verify', 'resolve', 'revoke')),
  outcome               TEXT NOT NULL
    CONSTRAINT person_auth_attempts_outcome_check
    CHECK (outcome IN ('success', 'rejected', 'failure', 'rate_limited')),
  reason_code           TEXT,
  environment_id        TEXT,
  -- sha256 del sujeto: el `sub` crudo NUNCA entra al ledger (igual que en oauth_audit_events).
  subject_hash          TEXT,
  ip_hash               TEXT,
  user_agent_hash       TEXT,
  correlation_id        TEXT,
  details               JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Los dos índices que el limitador y el forense necesitan de verdad.
CREATE INDEX IF NOT EXISTS person_auth_attempts_subject_idx
  ON greenhouse_auth.person_auth_attempts (subject_hash, occurred_at DESC)
  WHERE subject_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS person_auth_attempts_ip_idx
  ON greenhouse_auth.person_auth_attempts (ip_hash, occurred_at DESC)
  WHERE ip_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS person_auth_attempts_method_idx
  ON greenhouse_auth.person_auth_attempts (method, outcome, occurred_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_auth.block_person_auth_attempt_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_auth.person_auth_attempts is append-only (TASK-1830)';
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_person_auth_attempts_append_only ON greenhouse_auth.person_auth_attempts;
CREATE TRIGGER trg_person_auth_attempts_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_auth.person_auth_attempts
  FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.block_person_auth_attempt_mutation();

-- ─── Anti pre-up-marker bug guard (ISSUE-068) ────────────────────────────────

DO $$
DECLARE
  table_count INTEGER;
  fk_count INTEGER;
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_auth'
    AND table_name IN ('sessions', 'magic_link_tokens', 'auth_rate_limits', 'person_auth_attempts');

  SELECT COUNT(*) INTO fk_count
  FROM pg_constraint
  WHERE conname LIKE 'sessions_link_id_fkey%'
    AND connamespace = 'greenhouse_auth'::regnamespace;

  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'trg_person_auth_attempts_append_only'
    AND NOT tgisinternal;

  IF table_count <> 4 OR fk_count <> 1 OR trigger_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1830 anti pre-up-marker: expected 4 tables, 1 link FK and 1 append-only trigger, got tables=% fk=% triggers=%. Markers may be inverted.', table_count, fk_count, trigger_count;
  END IF;
END
$$;

-- ─── Ownership + GRANTs (runtime Cloud Run = greenhouse_app; portal = greenhouse_runtime) ───

ALTER TABLE greenhouse_auth.sessions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.magic_link_tokens OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.auth_rate_limits OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.person_auth_attempts OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_auth.block_person_auth_attempt_mutation() OWNER TO greenhouse_ops;

-- Sesiones y magic links: DELETE sólo para la limpieza de filas expiradas (command de GC).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.sessions TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.magic_link_tokens TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.auth_rate_limits TO greenhouse_runtime, greenhouse_app;

-- Ledger: sólo INSERT/SELECT (el trigger bloquea UPDATE/DELETE aunque el GRANT exista).
GRANT SELECT, INSERT ON greenhouse_auth.person_auth_attempts TO greenhouse_runtime, greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_auth TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_auth.block_person_auth_attempt_mutation() TO greenhouse_runtime, greenhouse_app;

-- La sesión lee el source link en cada request para morir cuando se revoca el acceso.
GRANT SELECT ON greenhouse_core.identity_profile_source_links TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_auth.person_auth_attempts;
DROP TABLE IF EXISTS greenhouse_auth.auth_rate_limits;
DROP TABLE IF EXISTS greenhouse_auth.magic_link_tokens;
DROP TABLE IF EXISTS greenhouse_auth.sessions;
DROP FUNCTION IF EXISTS greenhouse_auth.block_person_auth_attempt_mutation();
