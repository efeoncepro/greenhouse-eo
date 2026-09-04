-- Up Migration

-- TASK-1828 Slice 1 — Schema `greenhouse_auth` del authorization server propio de Efeonce
-- (EPIC-044, ADR EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1).
--
-- Additive-only. Esta migración crea el schema y el registry de llaves de firma; las
-- tablas de sesiones/tokens/consents/passkeys las declaran TASK-1829 y TASK-1830.
--
-- `signing_keys` NUNCA contiene material privado: la llave privada vive en Cloud KMS (HSM)
-- y aquí sólo se registra el `kid`, la referencia a la versión KMS, la pública (JWK) y el
-- estado del ciclo de vida. Invariante: ≤ 1 llave `active` a la vez; durante una rotación
-- coexisten `active` + `retiring` y ambas se publican en el JWKS.

CREATE SCHEMA IF NOT EXISTS greenhouse_auth;

CREATE TABLE IF NOT EXISTS greenhouse_auth.signing_keys (
  kid                TEXT PRIMARY KEY,
  kms_key_version    TEXT NOT NULL UNIQUE,
  algorithm          TEXT NOT NULL DEFAULT 'ES256'
    CONSTRAINT signing_keys_algorithm_check CHECK (algorithm = 'ES256'),
  public_jwk         JSONB NOT NULL,
  state              TEXT NOT NULL
    CONSTRAINT signing_keys_state_check CHECK (state IN ('active', 'retiring', 'retired')),
  activated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  retiring_at        TIMESTAMPTZ,
  retired_at         TIMESTAMPTZ,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT signing_keys_public_jwk_shape_check CHECK (
    public_jwk ? 'kty' AND public_jwk ? 'crv' AND public_jwk ? 'x' AND public_jwk ? 'y'
    AND NOT (public_jwk ? 'd')
  ),
  CONSTRAINT signing_keys_lifecycle_timestamps_check CHECK (
    (state = 'active'   AND retiring_at IS NULL     AND retired_at IS NULL) OR
    (state = 'retiring' AND retiring_at IS NOT NULL AND retired_at IS NULL) OR
    (state = 'retired'  AND retiring_at IS NOT NULL AND retired_at IS NOT NULL)
  )
);

-- Exactamente una llave activa como máximo (índice parcial único sobre una constante).
CREATE UNIQUE INDEX IF NOT EXISTS signing_keys_single_active_idx
  ON greenhouse_auth.signing_keys ((1))
  WHERE state = 'active';

CREATE INDEX IF NOT EXISTS signing_keys_state_idx
  ON greenhouse_auth.signing_keys (state);

-- Audit append-only del ciclo de vida de las llaves (registro, activación, retiro).
CREATE TABLE IF NOT EXISTS greenhouse_auth.signing_key_events (
  event_id     TEXT PRIMARY KEY DEFAULT ('ske-' || gen_random_uuid()::text),
  kid          TEXT NOT NULL REFERENCES greenhouse_auth.signing_keys (kid),
  event_type   TEXT NOT NULL
    CONSTRAINT signing_key_events_type_check
    CHECK (event_type IN ('registered', 'activated', 'retiring', 'retired')),
  actor        TEXT NOT NULL,
  details      JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signing_key_events_kid_idx
  ON greenhouse_auth.signing_key_events (kid, occurred_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_auth.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signing_keys_touch_updated_at ON greenhouse_auth.signing_keys;
CREATE TRIGGER trg_signing_keys_touch_updated_at
  BEFORE UPDATE ON greenhouse_auth.signing_keys
  FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.touch_updated_at();

CREATE OR REPLACE FUNCTION greenhouse_auth.block_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_auth.signing_key_events is append-only (TASK-1828)';
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signing_key_events_append_only ON greenhouse_auth.signing_key_events;
CREATE TRIGGER trg_signing_key_events_append_only
  BEFORE UPDATE OR DELETE ON greenhouse_auth.signing_key_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.block_event_mutation();

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si los objetos no quedaron creados.
DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_auth'
    AND table_name IN ('signing_keys', 'signing_key_events');

  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'greenhouse_auth'
    AND indexname = 'signing_keys_single_active_idx';

  IF table_count <> 2 OR index_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1828 anti pre-up-marker: expected 2 greenhouse_auth tables and the single-active index, got tables=% indexes=%. Markers may be inverted.', table_count, index_count;
  END IF;
END
$$;

-- Ownership + GRANTs (runtime Cloud Run = greenhouse_app; portal = greenhouse_runtime).
ALTER SCHEMA greenhouse_auth OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_auth TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_auth TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_auth TO greenhouse_migrator_user;

ALTER TABLE greenhouse_auth.signing_keys OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.signing_key_events OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_auth.touch_updated_at() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_auth.block_event_mutation() OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.signing_keys TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.signing_keys TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.signing_keys TO greenhouse_migrator_user;

-- Eventos: sólo INSERT/SELECT para runtime (el trigger bloquea UPDATE/DELETE aunque el GRANT exista).
GRANT SELECT, INSERT ON greenhouse_auth.signing_key_events TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_auth.signing_key_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.signing_key_events TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_auth.touch_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_auth.touch_updated_at() TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_auth.block_event_mutation() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_auth.block_event_mutation() TO greenhouse_app;

-- Down Migration

DROP SCHEMA IF EXISTS greenhouse_auth CASCADE;
