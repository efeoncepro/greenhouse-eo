-- Up Migration

CREATE SEQUENCE IF NOT EXISTS greenhouse_core.seq_sister_platform_consumer_public_id
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE TABLE IF NOT EXISTS greenhouse_core.sister_platform_consumers (
  sister_platform_consumer_id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  sister_platform_key text NOT NULL,
  consumer_name text NOT NULL,
  consumer_type text NOT NULL DEFAULT 'sister_platform',
  credential_status text NOT NULL DEFAULT 'active',
  token_prefix text NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  hash_algorithm text NOT NULL DEFAULT 'sha256',
  allowed_greenhouse_scope_types text[] NOT NULL DEFAULT ARRAY['organization', 'client', 'space', 'internal']::text[],
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  rate_limit_per_hour integer NOT NULL DEFAULT 1000,
  expires_at timestamp with time zone,
  last_used_at timestamp with time zone,
  notes text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text,
  rotated_by_user_id text,
  suspended_by_user_id text,
  deprecated_by_user_id text,
  suspended_at timestamp with time zone,
  deprecated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sister_platform_consumers_type_check CHECK (
    consumer_type = ANY (ARRAY['sister_platform'::text, 'mcp_adapter'::text, 'internal_service'::text])
  ),
  CONSTRAINT sister_platform_consumers_status_check CHECK (
    credential_status = ANY (ARRAY['draft'::text, 'active'::text, 'suspended'::text, 'deprecated'::text])
  ),
  CONSTRAINT sister_platform_consumers_hash_algorithm_check CHECK (
    hash_algorithm = ANY (ARRAY['sha256'::text])
  ),
  CONSTRAINT sister_platform_consumers_rate_limit_check CHECK (
    rate_limit_per_minute > 0
    AND rate_limit_per_hour > 0
    AND rate_limit_per_hour >= rate_limit_per_minute
  ),
  CONSTRAINT sister_platform_consumers_scope_types_check CHECK (
    cardinality(allowed_greenhouse_scope_types) > 0
    AND allowed_greenhouse_scope_types <@ ARRAY['organization'::text, 'client'::text, 'space'::text, 'internal'::text]
  ),
  CONSTRAINT sister_platform_consumers_status_timestamps_check CHECK (
    (credential_status <> 'suspended' OR suspended_at IS NOT NULL)
    AND (credential_status <> 'deprecated' OR deprecated_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_core.sister_platform_request_logs (
  sister_platform_request_log_id text PRIMARY KEY,
  sister_platform_consumer_id text,
  sister_platform_binding_id text,
  sister_platform_key text,
  external_scope_type text,
  external_scope_id text,
  greenhouse_scope_type text,
  organization_id text,
  client_id text,
  space_id text,
  request_method text NOT NULL,
  request_path text NOT NULL,
  route_key text NOT NULL,
  response_status integer NOT NULL,
  duration_ms integer NOT NULL,
  rate_limited boolean NOT NULL DEFAULT false,
  error_code text,
  ip_hash text,
  user_agent_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sister_platform_request_logs_external_scope_type_check CHECK (
    external_scope_type IS NULL
    OR external_scope_type = ANY (
      ARRAY[
        'tenant'::text,
        'workspace'::text,
        'portal'::text,
        'installation'::text,
        'client'::text,
        'space'::text,
        'organization'::text,
        'other'::text
      ]
    )
  ),
  CONSTRAINT sister_platform_request_logs_greenhouse_scope_type_check CHECK (
    greenhouse_scope_type IS NULL
    OR greenhouse_scope_type = ANY (ARRAY['organization'::text, 'client'::text, 'space'::text, 'internal'::text])
  ),
  CONSTRAINT sister_platform_request_logs_status_check CHECK (
    response_status BETWEEN 100 AND 599
  ),
  CONSTRAINT sister_platform_request_logs_duration_check CHECK (
    duration_ms >= 0
  )
);

ALTER TABLE greenhouse_core.sister_platform_request_logs
  ADD CONSTRAINT sister_platform_request_logs_consumer_fkey
  FOREIGN KEY (sister_platform_consumer_id)
  REFERENCES greenhouse_core.sister_platform_consumers (sister_platform_consumer_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_core.sister_platform_request_logs
  ADD CONSTRAINT sister_platform_request_logs_binding_fkey
  FOREIGN KEY (sister_platform_binding_id)
  REFERENCES greenhouse_core.sister_platform_bindings (sister_platform_binding_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_core.sister_platform_request_logs
  ADD CONSTRAINT sister_platform_request_logs_organization_fkey
  FOREIGN KEY (organization_id)
  REFERENCES greenhouse_core.organizations (organization_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_core.sister_platform_request_logs
  ADD CONSTRAINT sister_platform_request_logs_client_fkey
  FOREIGN KEY (client_id)
  REFERENCES greenhouse_core.clients (client_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_core.sister_platform_request_logs
  ADD CONSTRAINT sister_platform_request_logs_space_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.spaces (space_id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sister_platform_consumers_platform_status
  ON greenhouse_core.sister_platform_consumers (sister_platform_key, credential_status);

CREATE INDEX IF NOT EXISTS idx_sister_platform_consumers_token_prefix
  ON greenhouse_core.sister_platform_consumers (token_prefix, credential_status);

CREATE INDEX IF NOT EXISTS idx_sister_platform_request_logs_consumer_created_at
  ON greenhouse_core.sister_platform_request_logs (sister_platform_consumer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sister_platform_request_logs_binding_created_at
  ON greenhouse_core.sister_platform_request_logs (sister_platform_binding_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sister_platform_request_logs_route_created_at
  ON greenhouse_core.sister_platform_request_logs (route_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sister_platform_request_logs_status_created_at
  ON greenhouse_core.sister_platform_request_logs (response_status, created_at DESC);

ALTER TABLE greenhouse_core.sister_platform_consumers OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.sister_platform_request_logs OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_core.seq_sister_platform_consumer_public_id OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.sister_platform_consumers TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.seq_sister_platform_consumer_public_id TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.sister_platform_request_logs TO greenhouse_runtime;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_request_logs_status_created_at;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_request_logs_route_created_at;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_request_logs_binding_created_at;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_request_logs_consumer_created_at;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_consumers_token_prefix;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_consumers_platform_status;
DROP TABLE IF EXISTS greenhouse_core.sister_platform_request_logs;
DROP TABLE IF EXISTS greenhouse_core.sister_platform_consumers;
DROP SEQUENCE IF EXISTS greenhouse_core.seq_sister_platform_consumer_public_id;
