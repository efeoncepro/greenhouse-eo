-- Up Migration

-- TASK-1830 Slice 2 — Passkeys (WebAuthn) del emisor (EPIC-044).
--
-- Additive-only sobre `greenhouse_auth`. Dos tablas:
--   passkey_credentials  credenciales por persona (clave PÚBLICA + contador anti-clonación)
--   passkey_challenges   retos de un solo uso con TTL corto
--
-- Por qué existe `passkey_challenges` y no estaba en la lista original de la spec: un reto de
-- registro podría colgarse de la sesión, pero el de AUTENTICACIÓN ocurre ANTES de que exista
-- sesión, así que necesita almacenamiento propio. La alternativa —un valor firmado sin estado—
-- exigiría un secreto compartido entre instancias o una llamada a KMS por reto; una tabla con TTL
-- es más barata y hace el consumo único verificable.
--
-- Invariantes que sostiene el DDL: sólo material PÚBLICO (la privada nunca sale del autenticador);
-- el contador es monotónico y su retroceso invalida la credencial (lo aplica el runtime, el CHECK
-- sólo impide valores negativos); máximo 5 credenciales activas por persona (trigger); un reto se
-- consume una vez.

CREATE TABLE IF NOT EXISTS greenhouse_auth.passkey_credentials (
  -- `credential_id` en base64url tal como lo devuelve el navegador.
  credential_id       TEXT PRIMARY KEY,
  environment_id      TEXT NOT NULL,
  subject             TEXT NOT NULL,
  -- Clave PÚBLICA en formato COSE. Jamás hay material privado acá: vive en el autenticador.
  public_key          BYTEA NOT NULL,
  counter             BIGINT NOT NULL DEFAULT 0
    CONSTRAINT passkey_credentials_counter_check CHECK (counter >= 0),
  transports          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Nombre que le pone la persona al dispositivo ("MacBook del trabajo").
  device_name         TEXT,
  device_type         TEXT
    CONSTRAINT passkey_credentials_device_type_check
    CHECK (device_type IS NULL OR device_type IN ('singleDevice', 'multiDevice')),
  backed_up           BOOLEAN NOT NULL DEFAULT FALSE,
  aaguid              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at        TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  revoke_reason       TEXT,
  CONSTRAINT passkey_credentials_revoke_consistency_check CHECK (
    (revoked_at IS NULL AND revoke_reason IS NULL) OR (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS passkey_credentials_subject_live_idx
  ON greenhouse_auth.passkey_credentials (environment_id, subject, created_at DESC)
  WHERE revoked_at IS NULL;

-- Tope de credenciales activas por persona. En la aplicación también se valida, pero un tope que
-- sólo vive en el código se salta con cualquier camino nuevo hacia la misma tabla.
CREATE OR REPLACE FUNCTION greenhouse_auth.enforce_passkey_credential_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF NEW.revoked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM greenhouse_auth.passkey_credentials
  WHERE environment_id = NEW.environment_id
    AND subject = NEW.subject
    AND revoked_at IS NULL
    AND credential_id <> NEW.credential_id;

  IF active_count >= 5 THEN
    RAISE EXCEPTION 'passkey credential limit reached for this subject (max 5, TASK-1830)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_passkey_credentials_limit ON greenhouse_auth.passkey_credentials;
CREATE TRIGGER trg_passkey_credentials_limit
  BEFORE INSERT OR UPDATE ON greenhouse_auth.passkey_credentials
  FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.enforce_passkey_credential_limit();

CREATE TABLE IF NOT EXISTS greenhouse_auth.passkey_challenges (
  -- Sólo el sha256 del reto: el valor crudo vive en el navegador durante la ceremonia.
  challenge_hash      TEXT PRIMARY KEY
    CONSTRAINT passkey_challenges_hash_shape_check CHECK (challenge_hash ~ '^[0-9a-f]{64}$'),
  purpose             TEXT NOT NULL
    CONSTRAINT passkey_challenges_purpose_check CHECK (purpose IN ('registration', 'authentication')),
  environment_id      TEXT NOT NULL,
  -- `NULL` sólo en autenticación con credenciales descubribles: ahí el sujeto lo trae la aserción.
  subject             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL,
  consumed_at         TIMESTAMPTZ,
  ip_hash             TEXT,
  correlation_id      TEXT,
  CONSTRAINT passkey_challenges_registration_subject_check CHECK (purpose <> 'registration' OR subject IS NOT NULL),
  CONSTRAINT passkey_challenges_expires_after_creation_check CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS passkey_challenges_open_idx
  ON greenhouse_auth.passkey_challenges (expires_at)
  WHERE consumed_at IS NULL;

-- Anti pre-up-marker bug guard (ISSUE-068).
DO $$
DECLARE
  table_count INTEGER;
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_auth'
    AND table_name IN ('passkey_credentials', 'passkey_challenges');

  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'trg_passkey_credentials_limit'
    AND NOT tgisinternal;

  IF table_count <> 2 OR trigger_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1830 anti pre-up-marker: expected 2 passkey tables and the limit trigger, got tables=% triggers=%. Markers may be inverted.', table_count, trigger_count;
  END IF;
END
$$;

-- Ownership + GRANTs (runtime Cloud Run = greenhouse_app; portal = greenhouse_runtime).
ALTER TABLE greenhouse_auth.passkey_credentials OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.passkey_challenges OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_auth.enforce_passkey_credential_limit() OWNER TO greenhouse_ops;

-- Credenciales: nunca DELETE desde runtime (revocación, no borrado: el forense se conserva).
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.passkey_credentials TO greenhouse_runtime, greenhouse_app;
-- Retos: DELETE sólo para la limpieza de vencidos.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.passkey_challenges TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_auth TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_auth.enforce_passkey_credential_limit() TO greenhouse_runtime, greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_auth.passkey_challenges;
DROP TABLE IF EXISTS greenhouse_auth.passkey_credentials;
DROP FUNCTION IF EXISTS greenhouse_auth.enforce_passkey_credential_limit();
