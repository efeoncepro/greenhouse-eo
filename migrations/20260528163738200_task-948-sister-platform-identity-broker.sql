-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_core.sister_platform_oauth_clients (
  sister_platform_oauth_client_id text PRIMARY KEY,
  sister_platform_consumer_id text NOT NULL,
  client_id text NOT NULL UNIQUE,
  client_name text NOT NULL,
  client_status text NOT NULL DEFAULT 'active',
  redirect_uris text[] NOT NULL,
  allowed_scopes text[] NOT NULL DEFAULT ARRAY['openid', 'profile', 'email']::text[],
  code_ttl_seconds integer NOT NULL DEFAULT 300,
  access_token_ttl_seconds integer NOT NULL DEFAULT 300,
  require_pkce boolean NOT NULL DEFAULT true,
  issue_identity_inline boolean NOT NULL DEFAULT true,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id text,
  suspended_by_user_id text,
  deprecated_by_user_id text,
  suspended_at timestamp with time zone,
  deprecated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sister_platform_oauth_clients_consumer_fkey
    FOREIGN KEY (sister_platform_consumer_id)
    REFERENCES greenhouse_core.sister_platform_consumers (sister_platform_consumer_id)
    ON DELETE RESTRICT,
  CONSTRAINT sister_platform_oauth_clients_status_check CHECK (
    client_status = ANY (ARRAY['draft'::text, 'active'::text, 'suspended'::text, 'deprecated'::text])
  ),
  CONSTRAINT sister_platform_oauth_clients_redirects_check CHECK (
    cardinality(redirect_uris) > 0
    AND array_to_string(redirect_uris, ' ') NOT LIKE '%*%'
  ),
  CONSTRAINT sister_platform_oauth_clients_scopes_check CHECK (
    cardinality(allowed_scopes) > 0
  ),
  CONSTRAINT sister_platform_oauth_clients_ttl_check CHECK (
    code_ttl_seconds BETWEEN 60 AND 600
    AND access_token_ttl_seconds BETWEEN 60 AND 900
  ),
  CONSTRAINT sister_platform_oauth_clients_status_timestamps_check CHECK (
    (client_status <> 'suspended' OR suspended_at IS NOT NULL)
    AND (client_status <> 'deprecated' OR deprecated_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_core.sister_platform_authorization_codes (
  sister_platform_authorization_code_id text PRIMARY KEY,
  sister_platform_oauth_client_id text NOT NULL,
  sister_platform_consumer_id text NOT NULL,
  user_id text NOT NULL,
  identity_profile_id text,
  code_prefix text NOT NULL,
  code_hash text NOT NULL UNIQUE,
  hash_algorithm text NOT NULL DEFAULT 'sha256',
  redirect_uri text NOT NULL,
  requested_scopes text[] NOT NULL,
  state_hash text NOT NULL,
  nonce_hash text NOT NULL,
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  consumed_by_consumer_id text,
  consume_failure_count integer NOT NULL DEFAULT 0,
  last_failure_at timestamp with time zone,
  last_failure_code text,
  ip_hash text,
  user_agent_hash text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sister_platform_authorization_codes_client_fkey
    FOREIGN KEY (sister_platform_oauth_client_id)
    REFERENCES greenhouse_core.sister_platform_oauth_clients (sister_platform_oauth_client_id)
    ON DELETE RESTRICT,
  CONSTRAINT sister_platform_authorization_codes_consumer_fkey
    FOREIGN KEY (sister_platform_consumer_id)
    REFERENCES greenhouse_core.sister_platform_consumers (sister_platform_consumer_id)
    ON DELETE RESTRICT,
  CONSTRAINT sister_platform_authorization_codes_user_fkey
    FOREIGN KEY (user_id)
    REFERENCES greenhouse_core.client_users (user_id)
    ON DELETE RESTRICT,
  CONSTRAINT sister_platform_authorization_codes_identity_fkey
    FOREIGN KEY (identity_profile_id)
    REFERENCES greenhouse_core.identity_profiles (profile_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_authorization_codes_consumed_by_fkey
    FOREIGN KEY (consumed_by_consumer_id)
    REFERENCES greenhouse_core.sister_platform_consumers (sister_platform_consumer_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_authorization_codes_hash_algorithm_check CHECK (
    hash_algorithm = ANY (ARRAY['sha256'::text])
  ),
  CONSTRAINT sister_platform_authorization_codes_pkce_method_check CHECK (
    code_challenge_method = 'S256'
  ),
  CONSTRAINT sister_platform_authorization_codes_scopes_check CHECK (
    cardinality(requested_scopes) > 0
  ),
  CONSTRAINT sister_platform_authorization_codes_expiry_check CHECK (
    expires_at > created_at
  ),
  CONSTRAINT sister_platform_authorization_codes_failure_count_check CHECK (
    consume_failure_count >= 0
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_core.sister_platform_oauth_access_tokens (
  sister_platform_oauth_access_token_id text PRIMARY KEY,
  sister_platform_oauth_client_id text NOT NULL,
  sister_platform_consumer_id text NOT NULL,
  sister_platform_authorization_code_id text,
  user_id text NOT NULL,
  identity_profile_id text,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  hash_algorithm text NOT NULL DEFAULT 'sha256',
  scopes text[] NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sister_platform_oauth_access_tokens_client_fkey
    FOREIGN KEY (sister_platform_oauth_client_id)
    REFERENCES greenhouse_core.sister_platform_oauth_clients (sister_platform_oauth_client_id)
    ON DELETE RESTRICT,
  CONSTRAINT sister_platform_oauth_access_tokens_consumer_fkey
    FOREIGN KEY (sister_platform_consumer_id)
    REFERENCES greenhouse_core.sister_platform_consumers (sister_platform_consumer_id)
    ON DELETE RESTRICT,
  CONSTRAINT sister_platform_oauth_access_tokens_code_fkey
    FOREIGN KEY (sister_platform_authorization_code_id)
    REFERENCES greenhouse_core.sister_platform_authorization_codes (sister_platform_authorization_code_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_oauth_access_tokens_user_fkey
    FOREIGN KEY (user_id)
    REFERENCES greenhouse_core.client_users (user_id)
    ON DELETE RESTRICT,
  CONSTRAINT sister_platform_oauth_access_tokens_identity_fkey
    FOREIGN KEY (identity_profile_id)
    REFERENCES greenhouse_core.identity_profiles (profile_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_oauth_access_tokens_hash_algorithm_check CHECK (
    hash_algorithm = ANY (ARRAY['sha256'::text])
  ),
  CONSTRAINT sister_platform_oauth_access_tokens_scopes_check CHECK (
    cardinality(scopes) > 0
  ),
  CONSTRAINT sister_platform_oauth_access_tokens_expiry_check CHECK (
    expires_at > created_at
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_core.sister_platform_oauth_audit_log (
  sister_platform_oauth_audit_log_id text PRIMARY KEY,
  sister_platform_oauth_client_id text,
  sister_platform_consumer_id text,
  sister_platform_authorization_code_id text,
  sister_platform_oauth_access_token_id text,
  client_id text,
  user_id text,
  identity_profile_id text,
  event_type text NOT NULL,
  outcome text NOT NULL,
  error_code text,
  redirect_uri text,
  requested_scopes text[],
  response_status integer,
  duration_ms integer NOT NULL DEFAULT 0,
  ip_hash text,
  user_agent_hash text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sister_platform_oauth_audit_client_fkey
    FOREIGN KEY (sister_platform_oauth_client_id)
    REFERENCES greenhouse_core.sister_platform_oauth_clients (sister_platform_oauth_client_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_oauth_audit_consumer_fkey
    FOREIGN KEY (sister_platform_consumer_id)
    REFERENCES greenhouse_core.sister_platform_consumers (sister_platform_consumer_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_oauth_audit_code_fkey
    FOREIGN KEY (sister_platform_authorization_code_id)
    REFERENCES greenhouse_core.sister_platform_authorization_codes (sister_platform_authorization_code_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_oauth_audit_token_fkey
    FOREIGN KEY (sister_platform_oauth_access_token_id)
    REFERENCES greenhouse_core.sister_platform_oauth_access_tokens (sister_platform_oauth_access_token_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_oauth_audit_user_fkey
    FOREIGN KEY (user_id)
    REFERENCES greenhouse_core.client_users (user_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_oauth_audit_identity_fkey
    FOREIGN KEY (identity_profile_id)
    REFERENCES greenhouse_core.identity_profiles (profile_id)
    ON DELETE SET NULL,
  CONSTRAINT sister_platform_oauth_audit_event_type_check CHECK (
    event_type = ANY (
      ARRAY[
        'authorize_success'::text,
        'authorize_reject'::text,
        'token_success'::text,
        'token_reject'::text,
        'userinfo_success'::text,
        'userinfo_reject'::text,
        'code_replay'::text,
        'redirect_rejected'::text
      ]
    )
  ),
  CONSTRAINT sister_platform_oauth_audit_outcome_check CHECK (
    outcome = ANY (ARRAY['success'::text, 'rejected'::text, 'failure'::text])
  ),
  CONSTRAINT sister_platform_oauth_audit_status_check CHECK (
    response_status IS NULL OR response_status BETWEEN 100 AND 599
  ),
  CONSTRAINT sister_platform_oauth_audit_duration_check CHECK (
    duration_ms >= 0
  )
);

CREATE OR REPLACE FUNCTION greenhouse_core.prevent_sister_platform_oauth_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'sister_platform_oauth_audit_log is append-only.';
END;
$$;

DROP TRIGGER IF EXISTS sister_platform_oauth_audit_no_update ON greenhouse_core.sister_platform_oauth_audit_log;
CREATE TRIGGER sister_platform_oauth_audit_no_update
BEFORE UPDATE OR DELETE ON greenhouse_core.sister_platform_oauth_audit_log
FOR EACH ROW EXECUTE FUNCTION greenhouse_core.prevent_sister_platform_oauth_audit_mutation();

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_clients_consumer_status
  ON greenhouse_core.sister_platform_oauth_clients (sister_platform_consumer_id, client_status);

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_codes_client_created
  ON greenhouse_core.sister_platform_authorization_codes (sister_platform_oauth_client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_codes_user_created
  ON greenhouse_core.sister_platform_authorization_codes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_codes_expires
  ON greenhouse_core.sister_platform_authorization_codes (expires_at)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_tokens_prefix
  ON greenhouse_core.sister_platform_oauth_access_tokens (token_prefix)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_tokens_user_created
  ON greenhouse_core.sister_platform_oauth_access_tokens (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_audit_client_created
  ON greenhouse_core.sister_platform_oauth_audit_log (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_audit_event_created
  ON greenhouse_core.sister_platform_oauth_audit_log (event_type, outcome, created_at DESC);

COMMENT ON TABLE greenhouse_core.sister_platform_oauth_clients IS
  'TASK-948: approved OAuth/OIDC-style clients for sister-platform interactive SSO. Additive to existing SSO/SCIM contracts.';

COMMENT ON TABLE greenhouse_core.sister_platform_authorization_codes IS
  'TASK-948: one-time PKCE-bound authorization codes issued by Greenhouse identity broker for sister platforms.';

COMMENT ON TABLE greenhouse_core.sister_platform_oauth_access_tokens IS
  'TASK-948: short-lived opaque access tokens for sister-platform userinfo retrieval. No upstream provider tokens are stored here.';

COMMENT ON TABLE greenhouse_core.sister_platform_oauth_audit_log IS
  'TASK-948: append-only audit trail for sister-platform OAuth broker success, reject, replay and redirect rejection events.';

ALTER TABLE greenhouse_core.sister_platform_oauth_clients OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.sister_platform_authorization_codes OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.sister_platform_oauth_access_tokens OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_core.prevent_sister_platform_oauth_audit_mutation() OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.sister_platform_oauth_clients TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.sister_platform_authorization_codes TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.sister_platform_oauth_access_tokens TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_core.sister_platform_oauth_audit_log TO greenhouse_runtime;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_audit_event_created;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_audit_client_created;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_tokens_user_created;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_tokens_prefix;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_codes_expires;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_codes_user_created;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_codes_client_created;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_clients_consumer_status;

DROP TRIGGER IF EXISTS sister_platform_oauth_audit_no_update ON greenhouse_core.sister_platform_oauth_audit_log;
DROP TABLE IF EXISTS greenhouse_core.sister_platform_oauth_audit_log;
DROP TABLE IF EXISTS greenhouse_core.sister_platform_oauth_access_tokens;
DROP TABLE IF EXISTS greenhouse_core.sister_platform_authorization_codes;
DROP TABLE IF EXISTS greenhouse_core.sister_platform_oauth_clients;
DROP FUNCTION IF EXISTS greenhouse_core.prevent_sister_platform_oauth_audit_mutation();
