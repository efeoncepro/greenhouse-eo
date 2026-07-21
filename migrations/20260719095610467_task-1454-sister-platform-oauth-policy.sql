-- Up Migration

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  ADD COLUMN IF NOT EXISTS policy_json jsonb;

UPDATE greenhouse_core.sister_platform_oauth_clients
SET
  policy_json = jsonb_build_object(
    'schemaVersion', '1',
    'audience', jsonb_build_object('tenantTypes', jsonb_build_array('efeonce_internal')),
    'requiredScopes', jsonb_build_array('openid', 'kortex.operator_console.access'),
    'capabilityScopes', jsonb_build_array('kortex.operator_console.access'),
    'claims', jsonb_build_object('includeGreenhouseRoles', true),
    'revocation', jsonb_build_object(
      'mode', 'userinfo_revalidation',
      'revalidateAfterSeconds', 60,
      'requireOnPrivilegedAction', true
    )
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE lower(client_id) = 'kortex'
  AND policy_json IS NULL;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_clients_policy_json_check;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  ADD CONSTRAINT sister_platform_oauth_clients_policy_json_check CHECK (
    policy_json IS NULL OR jsonb_typeof(policy_json) = 'object'
  );

ALTER TABLE greenhouse_core.sister_platform_authorization_codes
  ADD COLUMN IF NOT EXISTS correlation_id text;

ALTER TABLE greenhouse_core.sister_platform_oauth_access_tokens
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS revoked_by_user_id text,
  ADD COLUMN IF NOT EXISTS revocation_reason text;

ALTER TABLE greenhouse_core.sister_platform_oauth_access_tokens
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_access_tokens_revoked_by_fkey;

ALTER TABLE greenhouse_core.sister_platform_oauth_access_tokens
  ADD CONSTRAINT sister_platform_oauth_access_tokens_revoked_by_fkey
    FOREIGN KEY (revoked_by_user_id)
    REFERENCES greenhouse_core.client_users (user_id)
    ON DELETE SET NULL;

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  ADD COLUMN IF NOT EXISTS correlation_id text;

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_audit_event_type_check;

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  ADD CONSTRAINT sister_platform_oauth_audit_event_type_check CHECK (
    event_type = ANY (
      ARRAY[
        'authorize_success'::text,
        'authorize_reject'::text,
        'token_success'::text,
        'token_reject'::text,
        'userinfo_success'::text,
        'userinfo_reject'::text,
        'code_replay'::text,
        'redirect_rejected'::text,
        'token_revoked'::text,
        'client_status_changed'::text
      ]
    )
  );

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_codes_correlation
  ON greenhouse_core.sister_platform_authorization_codes (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_tokens_correlation
  ON greenhouse_core.sister_platform_oauth_access_tokens (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sister_platform_oauth_audit_correlation_created
  ON greenhouse_core.sister_platform_oauth_audit_log (correlation_id, created_at DESC)
  WHERE correlation_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_core.sister_platform_oauth_clients.policy_json IS
  'TASK-1454: versioned, fail-closed audience/scope/claims/revocation policy evaluated generically by the broker.';

COMMENT ON COLUMN greenhouse_core.sister_platform_oauth_access_tokens.revocation_reason IS
  'TASK-1454: non-sensitive canonical reason for explicit token revocation.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_audit_correlation_created;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_tokens_correlation;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_oauth_codes_correlation;

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_audit_event_type_check;

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  ADD CONSTRAINT sister_platform_oauth_audit_event_type_check CHECK (
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
  );

ALTER TABLE greenhouse_core.sister_platform_oauth_audit_log
  DROP COLUMN IF EXISTS correlation_id;

ALTER TABLE greenhouse_core.sister_platform_oauth_access_tokens
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_access_tokens_revoked_by_fkey,
  DROP COLUMN IF EXISTS revocation_reason,
  DROP COLUMN IF EXISTS revoked_by_user_id,
  DROP COLUMN IF EXISTS correlation_id;

ALTER TABLE greenhouse_core.sister_platform_authorization_codes
  DROP COLUMN IF EXISTS correlation_id;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_clients_policy_json_check,
  DROP COLUMN IF EXISTS policy_json;
