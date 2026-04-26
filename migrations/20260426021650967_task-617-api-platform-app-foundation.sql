-- Up Migration
--
-- TASK-617.2: First-party app API foundation.
--
-- Adds durable user-scoped mobile/app sessions and a generic API Platform
-- request log. The ecosystem lane keeps its sister-platform-specific log for
-- compatibility, while new first-party app routes write here.

CREATE TABLE IF NOT EXISTS greenhouse_core.first_party_app_sessions (
  app_session_id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE,
  client_id text REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  organization_id text REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  session_status text NOT NULL DEFAULT 'active',
  refresh_token_hash text NOT NULL UNIQUE,
  hash_algorithm text NOT NULL DEFAULT 'sha256',
  device_label text,
  device_platform text,
  app_version text,
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  revoked_at timestamp with time zone,
  revoked_by_user_id text REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  revoked_reason text,
  ip_hash text,
  user_agent_hash text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT first_party_app_sessions_status_check CHECK (
    session_status = ANY (ARRAY['active'::text, 'revoked'::text, 'expired'::text])
  ),
  CONSTRAINT first_party_app_sessions_hash_algorithm_check CHECK (
    hash_algorithm = ANY (ARRAY['sha256'::text])
  ),
  CONSTRAINT first_party_app_sessions_revoked_check CHECK (
    session_status <> 'revoked' OR revoked_at IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_core.api_platform_request_logs (
  api_platform_request_log_id text PRIMARY KEY,
  lane text NOT NULL,
  app_session_id text REFERENCES greenhouse_core.first_party_app_sessions(app_session_id) ON DELETE SET NULL,
  user_id text REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  consumer_id text,
  route_key text NOT NULL,
  request_method text NOT NULL,
  request_path text NOT NULL,
  response_status integer NOT NULL,
  duration_ms integer NOT NULL,
  rate_limited boolean NOT NULL DEFAULT false,
  error_code text,
  client_id text REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  organization_id text REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL,
  ip_hash text,
  user_agent_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT api_platform_request_logs_lane_check CHECK (
    lane = ANY (ARRAY['app'::text, 'ecosystem'::text, 'internal'::text, 'public'::text])
  ),
  CONSTRAINT api_platform_request_logs_status_check CHECK (
    response_status BETWEEN 100 AND 599
  ),
  CONSTRAINT api_platform_request_logs_duration_check CHECK (
    duration_ms >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_first_party_app_sessions_user_status
  ON greenhouse_core.first_party_app_sessions (user_id, session_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_first_party_app_sessions_refresh_hash
  ON greenhouse_core.first_party_app_sessions (refresh_token_hash);

CREATE INDEX IF NOT EXISTS idx_first_party_app_sessions_expires
  ON greenhouse_core.first_party_app_sessions (expires_at)
  WHERE session_status = 'active';

CREATE INDEX IF NOT EXISTS idx_api_platform_request_logs_lane_created
  ON greenhouse_core.api_platform_request_logs (lane, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_platform_request_logs_user_created
  ON greenhouse_core.api_platform_request_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_platform_request_logs_session_created
  ON greenhouse_core.api_platform_request_logs (app_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_platform_request_logs_route_created
  ON greenhouse_core.api_platform_request_logs (route_key, created_at DESC);

ALTER TABLE greenhouse_core.first_party_app_sessions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.api_platform_request_logs OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.first_party_app_sessions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.first_party_app_sessions TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.api_platform_request_logs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.api_platform_request_logs TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_core.first_party_app_sessions IS
  'TASK-617.2: durable first-party app sessions for mobile/non-web Greenhouse clients. Stores hashed refresh tokens only.';

COMMENT ON TABLE greenhouse_core.api_platform_request_logs IS
  'TASK-617: generic API Platform request audit log for first-party app and future lanes. Ecosystem keeps its legacy sister-platform log too.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.idx_api_platform_request_logs_route_created;
DROP INDEX IF EXISTS greenhouse_core.idx_api_platform_request_logs_session_created;
DROP INDEX IF EXISTS greenhouse_core.idx_api_platform_request_logs_user_created;
DROP INDEX IF EXISTS greenhouse_core.idx_api_platform_request_logs_lane_created;
DROP INDEX IF EXISTS greenhouse_core.idx_first_party_app_sessions_expires;
DROP INDEX IF EXISTS greenhouse_core.idx_first_party_app_sessions_refresh_hash;
DROP INDEX IF EXISTS greenhouse_core.idx_first_party_app_sessions_user_status;
DROP TABLE IF EXISTS greenhouse_core.api_platform_request_logs;
DROP TABLE IF EXISTS greenhouse_core.first_party_app_sessions;
