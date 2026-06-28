-- Up Migration
--
-- TASK-1282 — Growth: Search Console Multi-Tenant Connection (OAuth + per-org token).
-- Fundación backend para que cualquier marca cliente conecte SU propiedad de Google
-- Search Console vía OAuth 3-legged, con token POR-ORG (el token ES el scope). El
-- refresh token NUNCA vive en PG: sólo `token_secret_ref` apunta a Secret Manager
-- (mirror del patrón Notion per-cliente `notion_token_secret_ref`). Mantiene 2 tablas:
--   1. search_console_connections — metadata de la conexión activa por org (UNIQUE org).
--   2. search_console_oauth_states — state firmado single-use que ancla la org server-side
--      (anti-CSRF / confused-deputy): la callback confía en este row, NUNCA en el browser.

SET search_path TO public, greenhouse_growth;

-- 1. Conexión activa por organización (1 conexión por org; reconectar = upsert).
CREATE TABLE IF NOT EXISTS greenhouse_growth.search_console_connections (
  connection_id          TEXT PRIMARY KEY DEFAULT ('gsc-conn-' || gen_random_uuid()::text),
  organization_id        TEXT NOT NULL UNIQUE
                           REFERENCES greenhouse_core.organizations (organization_id) ON DELETE CASCADE,
  site_url               TEXT NOT NULL,
  scopes                 TEXT[] NOT NULL DEFAULT ARRAY['https://www.googleapis.com/auth/webmasters.readonly'],
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('active', 'revoked', 'expired', 'pending')),
  -- Referencia al secreto en Secret Manager (el secret name, p.ej.
  -- `search-console-token-<org>`). NUNCA el refresh/access token crudo.
  token_secret_ref       TEXT NULL,
  connected_by_user_id   TEXT NULL,
  connected_at           TIMESTAMPTZ NULL,
  last_verified_at       TIMESTAMPTZ NULL,
  last_error_code        TEXT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS search_console_connections_status_idx
  ON greenhouse_growth.search_console_connections (status);

-- 2. State OAuth single-use, firmado (hash) + anclado a la org server-side.
--    La callback valida: hash existe + no consumido + no expirado + org del row.
CREATE TABLE IF NOT EXISTS greenhouse_growth.search_console_oauth_states (
  state_id            TEXT PRIMARY KEY DEFAULT ('gsc-state-' || gen_random_uuid()::text),
  state_hash          TEXT NOT NULL UNIQUE,
  organization_id     TEXT NOT NULL
                        REFERENCES greenhouse_core.organizations (organization_id) ON DELETE CASCADE,
  site_url            TEXT NOT NULL,
  created_by_user_id  TEXT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  consumed_at         TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS search_console_oauth_states_expires_idx
  ON greenhouse_growth.search_console_oauth_states (expires_at)
  WHERE consumed_at IS NULL;

-- 3. Anti pre-up-marker: aborta si las tablas no quedaron creadas.
DO $$
DECLARE conn_ok boolean; state_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'greenhouse_growth' AND table_name = 'search_console_connections'
  ) INTO conn_ok;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'greenhouse_growth' AND table_name = 'search_console_oauth_states'
  ) INTO state_ok;

  IF NOT (conn_ok AND state_ok) THEN
    RAISE EXCEPTION 'TASK-1282 anti pre-up-marker: tablas NO creadas (connections=% states=%).',
      conn_ok, state_ok;
  END IF;
END
$$;

-- 4. Ownership + GRANTs (runtime escribe metadata; el token va por Secret Manager).
ALTER TABLE greenhouse_growth.search_console_connections OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.search_console_oauth_states OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.search_console_connections TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.search_console_connections TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.search_console_connections TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.search_console_oauth_states TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.search_console_oauth_states TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.search_console_oauth_states TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.search_console_oauth_states;
DROP TABLE IF EXISTS greenhouse_growth.search_console_connections;
