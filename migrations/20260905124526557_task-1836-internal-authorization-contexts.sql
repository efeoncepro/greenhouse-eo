-- Up Migration
SET search_path = greenhouse_auth, greenhouse_core, public;

-- TASK-1836: additive, flags OFF. Upstream material is encrypted at rest; only browser binding is hashed.
CREATE TABLE greenhouse_auth.internal_login_transactions (
  transaction_id text PRIMARY KEY CHECK (transaction_id ~ '^[A-Za-z0-9_-]{43}$'),
  browser_binding_hash text NOT NULL CHECK (browser_binding_hash ~ '^[0-9a-f]{64}$'),
  encrypted_payload text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > created_at),
  consumed_at timestamptz
);
CREATE INDEX internal_login_transactions_expiry_idx ON greenhouse_auth.internal_login_transactions(expires_at);

-- Corporate provenance is never inferred from the person's memberships or from a submitted auth method.
CREATE TABLE greenhouse_auth.corporate_session_evidence (
  session_hash text PRIMARY KEY REFERENCES greenhouse_auth.sessions(session_hash) ON DELETE RESTRICT,
  upstream_link_id text NOT NULL REFERENCES greenhouse_core.identity_profile_source_links(link_id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL,
  object_id uuid NOT NULL,
  upstream_issuer text NOT NULL,
  authenticated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE greenhouse_auth.authorization_contexts (
  context_id uuid PRIMARY KEY,
  context_version integer NOT NULL DEFAULT 1 CHECK (context_version = 1),
  issuer text NOT NULL,
  environment_id text NOT NULL REFERENCES greenhouse_core.external_identity_environments(environment_id) ON DELETE RESTRICT,
  subject text NOT NULL,
  profile_id text NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE RESTRICT,
  client_id text NOT NULL REFERENCES greenhouse_auth.oauth_clients(client_id) ON DELETE RESTRICT,
  audience text NOT NULL,
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id) ON DELETE RESTRICT,
  binding_id text NOT NULL REFERENCES greenhouse_core.external_organization_bindings(binding_id) ON DELETE RESTRICT,
  session_hash text NOT NULL REFERENCES greenhouse_auth.corporate_session_evidence(session_hash) ON DELETE RESTRICT,
  upstream_link_id text NOT NULL REFERENCES greenhouse_core.identity_profile_source_links(link_id) ON DELETE RESTRICT,
  auth_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at > created_at),
  revoked_at timestamptz,
  revoke_reason text,
  CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL))
);
CREATE INDEX authorization_contexts_subject_idx ON greenhouse_auth.authorization_contexts(environment_id, subject) WHERE revoked_at IS NULL;
CREATE INDEX authorization_contexts_binding_idx ON greenhouse_auth.authorization_contexts(binding_id) WHERE revoked_at IS NULL;

ALTER TABLE greenhouse_auth.authorization_codes ADD COLUMN authorization_context_id uuid REFERENCES greenhouse_auth.authorization_contexts(context_id) ON DELETE RESTRICT;
ALTER TABLE greenhouse_auth.refresh_tokens ADD COLUMN authorization_context_id uuid REFERENCES greenhouse_auth.authorization_contexts(context_id) ON DELETE RESTRICT;
ALTER TABLE greenhouse_auth.refresh_tokens ADD COLUMN auth_time timestamptz;
ALTER TABLE greenhouse_auth.access_tokens ADD COLUMN authorization_context_id uuid REFERENCES greenhouse_auth.authorization_contexts(context_id) ON DELETE RESTRICT;
ALTER TABLE greenhouse_auth.client_consents ADD COLUMN authorization_context_id uuid REFERENCES greenhouse_auth.authorization_contexts(context_id) ON DELETE RESTRICT;

ALTER TABLE greenhouse_auth.internal_login_transactions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.corporate_session_evidence OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.authorization_contexts OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.internal_login_transactions, greenhouse_auth.authorization_contexts TO greenhouse_app, greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_auth.corporate_session_evidence TO greenhouse_app, greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_auth.internal_login_transactions, greenhouse_auth.corporate_session_evidence, greenhouse_auth.authorization_contexts TO greenhouse_migrator_user;

-- Consent for one context never approves another context, nor promotes a legacy consent.
DROP INDEX greenhouse_auth.client_consents_active_uidx;
CREATE UNIQUE INDEX client_consents_active_uidx ON greenhouse_auth.client_consents
  (environment_id, subject, client_id, scope, COALESCE(authorization_context_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'active';

-- Preserve known original authentication times of existing refresh families. Unknown remains NULL.
UPDATE greenhouse_auth.refresh_tokens r SET auth_time = c.auth_time
  FROM greenhouse_auth.authorization_codes c WHERE r.grant_id = c.grant_id AND r.auth_time IS NULL;

-- One server-selected context per session/client/binding, stable across authorize and consent requests.
CREATE UNIQUE INDEX authorization_contexts_session_client_uidx ON greenhouse_auth.authorization_contexts
  (session_hash, client_id, binding_id, issuer, audience) WHERE revoked_at IS NULL;

ALTER TABLE greenhouse_auth.person_auth_attempts DROP CONSTRAINT person_auth_attempts_method_check;
ALTER TABLE greenhouse_auth.person_auth_attempts ADD CONSTRAINT person_auth_attempts_method_check
  CHECK (method IN ('magic_link','passkey','totp','invitation','session','recovery','entra_oidc'));

CREATE TABLE greenhouse_core.internal_native_enrollments (
 enrollment_id text PRIMARY KEY,
 environment_id text NOT NULL REFERENCES greenhouse_core.external_identity_environments(environment_id),
 profile_id text NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id),
 binding_id text NOT NULL REFERENCES greenhouse_core.external_organization_bindings(binding_id),
 upstream_link_id text NOT NULL REFERENCES greenhouse_core.identity_profile_source_links(link_id),
 native_link_id text NOT NULL REFERENCES greenhouse_core.identity_profile_source_links(link_id),
 tenant_id uuid NOT NULL, object_id uuid NOT NULL,
 status text NOT NULL CHECK (status IN ('active','revoked')),
 enrolled_by text NOT NULL, reason text NOT NULL CHECK (length(trim(reason)) > 0),
 enrolled_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, revoked_by text,
 UNIQUE (environment_id,profile_id), UNIQUE (environment_id,tenant_id,object_id), UNIQUE (native_link_id),
 CHECK ((status = 'revoked') = (revoked_at IS NOT NULL AND revoked_by IS NOT NULL))
);
CREATE TABLE greenhouse_core.internal_native_access_audit (
 audit_id text PRIMARY KEY, event_type text NOT NULL, enrollment_id text,
 actor_id text NOT NULL, reason text NOT NULL, metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION greenhouse_core.block_internal_native_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'internal_native_access_audit is append-only'; END;
$$;
CREATE TRIGGER internal_native_access_audit_append_only BEFORE UPDATE OR DELETE ON greenhouse_core.internal_native_access_audit
 FOR EACH ROW EXECUTE FUNCTION greenhouse_core.block_internal_native_audit_mutation();
ALTER TABLE greenhouse_core.internal_native_enrollments OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.internal_native_access_audit OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_core.block_internal_native_audit_mutation() OWNER TO greenhouse_ops;
GRANT SELECT,INSERT,UPDATE ON greenhouse_core.internal_native_enrollments TO greenhouse_app,greenhouse_runtime;
GRANT SELECT,INSERT ON greenhouse_core.internal_native_access_audit TO greenhouse_app,greenhouse_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON greenhouse_core.internal_native_enrollments TO greenhouse_migrator_user;
GRANT SELECT,INSERT ON greenhouse_core.internal_native_access_audit TO greenhouse_migrator_user;
ALTER TABLE greenhouse_core.external_capability_grants ADD COLUMN expires_at timestamptz;

-- Down Migration
-- Rollback is operational (flags OFF + revoke new contexts), not destructive DDL. Preserve identity/audit.
