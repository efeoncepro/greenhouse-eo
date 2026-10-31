-- TASK-1834 local ephemeral PostgreSQL ONLY. The runner creates and destroys this database.
-- Minimal existing tables used by the real identity queries, not a production migration.
CREATE SCHEMA IF NOT EXISTS greenhouse_core;
CREATE SCHEMA IF NOT EXISTS greenhouse_auth;
CREATE TABLE greenhouse_core.identity_profiles (
 profile_id TEXT PRIMARY KEY, active BOOLEAN NOT NULL DEFAULT TRUE, status TEXT NOT NULL DEFAULT 'active',
 merged_into_profile_id TEXT, profile_type TEXT NOT NULL DEFAULT 'external_contact'
);
CREATE TABLE greenhouse_core.identity_profile_source_links (
 link_id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id),
 source_system TEXT NOT NULL, source_object_type TEXT NOT NULL, source_object_id TEXT NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE, is_login_identity BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE greenhouse_core.external_identity_environments (environment_id TEXT PRIMARY KEY,status TEXT NOT NULL);
CREATE TABLE greenhouse_core.client_users (
 user_id TEXT PRIMARY KEY, identity_profile_id TEXT NOT NULL, member_id TEXT NOT NULL,
 active BOOLEAN NOT NULL, status TEXT NOT NULL, tenant_type TEXT NOT NULL,
 microsoft_oid TEXT, microsoft_tenant_id TEXT
);
CREATE TABLE greenhouse_core.members (
 member_id TEXT PRIMARY KEY, identity_profile_id TEXT NOT NULL, active BOOLEAN NOT NULL, azure_oid TEXT
);
CREATE TABLE greenhouse_core.organizations (
 organization_id TEXT PRIMARY KEY, public_id TEXT NOT NULL, active BOOLEAN NOT NULL, status TEXT NOT NULL, is_operating_entity BOOLEAN NOT NULL
);
CREATE TABLE greenhouse_core.person_memberships (
 profile_id TEXT NOT NULL, organization_id TEXT NOT NULL, membership_type TEXT NOT NULL, active BOOLEAN NOT NULL, status TEXT NOT NULL
);
CREATE TABLE greenhouse_core.person_legal_entity_relationships (
 profile_id TEXT NOT NULL, legal_entity_organization_id TEXT NOT NULL, relationship_type TEXT NOT NULL,
 status TEXT NOT NULL, effective_from DATE NOT NULL, effective_to DATE
);
CREATE TABLE greenhouse_core.internal_native_enrollments (
 profile_id TEXT NOT NULL, native_link_id TEXT NOT NULL, upstream_link_id TEXT NOT NULL,
 environment_id TEXT NOT NULL, tenant_id UUID NOT NULL, object_id UUID NOT NULL, status TEXT NOT NULL
);
CREATE TABLE greenhouse_auth.sessions (
 session_hash TEXT PRIMARY KEY, subject TEXT NOT NULL, profile_id TEXT NOT NULL, environment_id TEXT NOT NULL,
 link_id TEXT NOT NULL, amr TEXT[] NOT NULL, auth_time TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 absolute_expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ
);
CREATE TABLE greenhouse_auth.corporate_session_evidence (
 session_hash TEXT PRIMARY KEY, upstream_link_id TEXT NOT NULL, tenant_id UUID NOT NULL, object_id UUID NOT NULL,
 upstream_issuer TEXT NOT NULL, authenticated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE greenhouse_auth.oauth_audit_events (
 event_id TEXT PRIMARY KEY DEFAULT ('oae-' || gen_random_uuid()::text),event_type TEXT NOT NULL,
 outcome TEXT NOT NULL, client_id TEXT, subject_hash TEXT, grant_id TEXT, error_code TEXT,
 ip_hash TEXT, user_agent_hash TEXT, correlation_id TEXT, details JSONB NOT NULL DEFAULT '{}', occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE FUNCTION greenhouse_auth.block_local_audit_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit append-only'; END $$;
CREATE TRIGGER local_audit_append_only BEFORE UPDATE OR DELETE ON greenhouse_auth.oauth_audit_events
FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.block_local_audit_mutation();
GRANT USAGE ON SCHEMA greenhouse_auth,greenhouse_core TO greenhouse_ops,greenhouse_app,greenhouse_runtime;
GRANT ALL ON ALL TABLES IN SCHEMA greenhouse_auth,greenhouse_core TO greenhouse_ops,greenhouse_app,greenhouse_runtime;
