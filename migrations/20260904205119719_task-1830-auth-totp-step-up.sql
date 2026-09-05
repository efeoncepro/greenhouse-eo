-- Up Migration

-- TASK-1830 Slice 3 — TOTP como segundo factor del emisor (EPIC-044).
--
-- Additive-only sobre `greenhouse_auth`. Dos tablas:
--   totp_enrollments   un enrolamiento por persona; el secreto SÓLO cifrado por Cloud KMS
--   totp_backup_codes  códigos de respaldo de un solo uso (sólo su sha256)
--
-- El secreto TOTP es simétrico: el servidor tiene que poder leerlo para verificar un código, así
-- que va cifrado en reposo con la llave `auth-server-totp-envelope` (KMS HSM, ENCRYPT_DECRYPT,
-- rotación 90 d). La llave de firma `auth-server-es256` NO sirve para esto: es EC de firma.
-- El cifrado usa AAD `<environment>|<subject>`, así que un ciphertext movido a otra fila NO
-- descifra — verificado contra KMS real antes de escribir esta migración.
--
-- `last_used_step` cierra el replay: un código TOTP vive 30 s y la ventana ±1 lo estira a 90 s.
-- Sin recordar el último paso aceptado, quien intercepte un código lo reusa dentro de esa ventana.
--
-- Los códigos de respaldo se guardan como sha256 y NO con un KDF lento, porque nacen de 128 bits
-- de entropía (el problema que el KDF resuelve —secretos adivinables— no existe acá).

CREATE TABLE IF NOT EXISTS greenhouse_auth.totp_enrollments (
  environment_id      TEXT NOT NULL,
  subject             TEXT NOT NULL,
  -- Ciphertext de KMS. NUNCA el secreto en claro, ni siquiera transitoriamente en una columna.
  secret_ciphertext   BYTEA NOT NULL,
  -- Llave que cifró: si el nombre cambia, se sabe qué filas hay que re-envolver.
  kms_key_name        TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT totp_enrollments_status_check CHECK (status IN ('pending', 'active', 'revoked')),
  -- Paso de tiempo del último código aceptado: un código no se acepta dos veces (anti-replay).
  last_used_step      BIGINT
    CONSTRAINT totp_enrollments_last_used_step_check CHECK (last_used_step IS NULL OR last_used_step >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at        TIMESTAMPTZ,
  last_verified_at    TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  revoke_reason       TEXT,
  PRIMARY KEY (environment_id, subject),
  -- `active` exige confirmación: un enrolamiento sin código verificado no es un segundo factor.
  CONSTRAINT totp_enrollments_confirmed_when_active_check CHECK (status <> 'active' OR confirmed_at IS NOT NULL),
  CONSTRAINT totp_enrollments_revoke_consistency_check CHECK (
    (status <> 'revoked' AND revoked_at IS NULL AND revoke_reason IS NULL) OR
    (status = 'revoked' AND revoked_at IS NOT NULL AND revoke_reason IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_auth.totp_backup_codes (
  code_hash           TEXT PRIMARY KEY
    CONSTRAINT totp_backup_codes_hash_shape_check CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  environment_id      TEXT NOT NULL,
  subject             TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at         TIMESTAMPTZ,
  consumed_ip_hash    TEXT,
  CONSTRAINT totp_backup_codes_enrollment_fk
    FOREIGN KEY (environment_id, subject)
    REFERENCES greenhouse_auth.totp_enrollments (environment_id, subject) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS totp_backup_codes_open_idx
  ON greenhouse_auth.totp_backup_codes (environment_id, subject)
  WHERE consumed_at IS NULL;

-- Anti pre-up-marker bug guard (ISSUE-068).
DO $$
DECLARE
  table_count INTEGER;
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_auth'
    AND table_name IN ('totp_enrollments', 'totp_backup_codes');

  SELECT COUNT(*) INTO fk_count
  FROM pg_constraint
  WHERE conname = 'totp_backup_codes_enrollment_fk'
    AND connamespace = 'greenhouse_auth'::regnamespace;

  IF table_count <> 2 OR fk_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1830 anti pre-up-marker: expected 2 TOTP tables and the enrollment FK, got tables=% fk=%. Markers may be inverted.', table_count, fk_count;
  END IF;
END
$$;

-- Ownership + GRANTs (runtime Cloud Run = greenhouse_app; portal = greenhouse_runtime).
ALTER TABLE greenhouse_auth.totp_enrollments OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.totp_backup_codes OWNER TO greenhouse_ops;

-- Enrolamientos: nunca DELETE desde runtime (revocación, no borrado).
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.totp_enrollments TO greenhouse_runtime, greenhouse_app;
-- Códigos de respaldo: DELETE al re-generar el set completo tras una recuperación.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.totp_backup_codes TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_auth TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_auth.totp_backup_codes;
DROP TABLE IF EXISTS greenhouse_auth.totp_enrollments;
