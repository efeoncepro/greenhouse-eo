-- Local QA projection of the TASK-1631/TASK-1832/TASK-1836 reader columns only.
-- This is not a production migration and intentionally has no production grants.
ALTER TABLE greenhouse_core.external_identity_environments ADD COLUMN issuer_class text NOT NULL DEFAULT 'external';
ALTER TABLE greenhouse_core.identity_profiles ADD COLUMN data_origin text NOT NULL DEFAULT 'real';
ALTER TABLE greenhouse_core.identity_profile_source_links ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE greenhouse_core.organizations ADD COLUMN organization_name text;

CREATE TABLE greenhouse_core.external_organization_bindings (
  binding_id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  environment_id text NOT NULL REFERENCES greenhouse_core.external_identity_environments(environment_id),
  external_organization_ref text NOT NULL,
  population text NOT NULL CHECK (population = 'external'),
  binding_purpose text NOT NULL CHECK (binding_purpose = 'customer'),
  canary_registration_id text,
  expires_at timestamptz,
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  grants_version integer NOT NULL CHECK (grants_version > 0),
  designated_admin_profile_id text,
  revoked_at timestamptz,
  bound_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE greenhouse_core.external_canary_registrations (
  canary_registration_id text PRIMARY KEY,
  organization_id text NOT NULL,
  environment_id text NOT NULL,
  external_organization_ref text NOT NULL,
  status text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE greenhouse_core.external_member_invitations (
  invitation_id text PRIMARY KEY,
  binding_id text NOT NULL REFERENCES greenhouse_core.external_organization_bindings(binding_id),
  profile_id text NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id),
  status text NOT NULL CHECK (status IN ('linked', 'revoked')),
  linked_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE TABLE greenhouse_core.external_capability_grants (
  grant_id text PRIMARY KEY,
  binding_id text NOT NULL REFERENCES greenhouse_core.external_organization_bindings(binding_id),
  capability text NOT NULL,
  profile_id text,
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  expires_at timestamptz
);
CREATE TABLE greenhouse_core.external_access_resolution_log (
  resolution_id text PRIMARY KEY,
  environment_id text NOT NULL,
  subject_hash text NOT NULL,
  client_id text,
  outcome text NOT NULL,
  binding_id text,
  profile_id text,
  grants_version integer,
  resolved_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION greenhouse_core.block_local_resolution_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'resolution log append-only'; END $$;
CREATE TRIGGER local_resolution_append_only BEFORE UPDATE OR DELETE ON greenhouse_core.external_access_resolution_log
FOR EACH ROW EXECUTE FUNCTION greenhouse_core.block_local_resolution_mutation();

-- Ecosystem machine-reader projection: the production route, consumer lookup,
-- sister-platform binding and request audit run unchanged against disposable rows.
CREATE TABLE greenhouse_core.clients (client_id text PRIMARY KEY, client_name text);
CREATE TABLE greenhouse_core.spaces (space_id text PRIMARY KEY, space_name text);
CREATE TABLE greenhouse_core.sister_platform_consumers (
  sister_platform_consumer_id text PRIMARY KEY,
  public_id text NOT NULL,
  sister_platform_key text NOT NULL,
  consumer_name text NOT NULL,
  consumer_type text NOT NULL,
  credential_status text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL,
  hash_algorithm text NOT NULL,
  allowed_greenhouse_scope_types text[],
  rate_limit_per_minute integer NOT NULL,
  rate_limit_per_hour integer NOT NULL,
  expires_at timestamptz,
  last_used_at timestamptz,
  notes text,
  metadata_json jsonb,
  created_by_user_id text,
  rotated_by_user_id text,
  suspended_by_user_id text,
  deprecated_by_user_id text,
  suspended_at timestamptz,
  deprecated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE greenhouse_core.sister_platform_bindings (
  sister_platform_binding_id text PRIMARY KEY,
  public_id text NOT NULL,
  sister_platform_key text NOT NULL,
  external_scope_type text NOT NULL,
  external_scope_id text NOT NULL,
  external_scope_parent_id text,
  external_display_name text,
  greenhouse_scope_type text NOT NULL,
  organization_id text,
  client_id text,
  space_id text,
  binding_role text NOT NULL,
  binding_status text NOT NULL,
  notes text,
  metadata_json jsonb,
  last_verified_at timestamptz,
  created_by_user_id text,
  activated_by_user_id text,
  suspended_by_user_id text,
  deprecated_by_user_id text,
  activated_at timestamptz,
  suspended_at timestamptz,
  deprecated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE greenhouse_core.sister_platform_request_logs (
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
  rate_limited boolean NOT NULL,
  error_code text,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON ALL TABLES IN SCHEMA greenhouse_core TO greenhouse_ops,greenhouse_app,greenhouse_runtime;
