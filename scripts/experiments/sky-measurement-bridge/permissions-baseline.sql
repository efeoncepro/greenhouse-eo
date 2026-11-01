-- Local dependency fixtures only. App-session table is loaded verbatim by runner from TASK-617 migration.
CREATE SCHEMA greenhouse_client_portal;
CREATE SCHEMA sky_experiment;
CREATE TABLE greenhouse_client_portal.module_assignments (
 organization_id text REFERENCES greenhouse_core.organizations, module_key text, status text,
 effective_from timestamptz DEFAULT now(), effective_to timestamptz, expires_at timestamptz
);
-- Minimum shape for the REAL report reader, not production schema parity.
CREATE TABLE greenhouse_insights.insight_reports (
 report_id text PRIMARY KEY, report_code text, organization_id text REFERENCES greenhouse_core.organizations,
 purpose text, title text, status text DEFAULT 'active', created_by_actor_kind text DEFAULT 'member',
 created_by_user_id text, created_by_member_id text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
-- Candidate authority, deliberately distinct from descriptive person_memberships. NOT a proposed migration.
CREATE TABLE sky_experiment.space_grants (
 grant_id text PRIMARY KEY, profile_id text NOT NULL, organization_id text REFERENCES greenhouse_core.organizations,
 space_id text REFERENCES greenhouse_core.spaces, needs text[] NOT NULL,
 version integer NOT NULL DEFAULT 1, active boolean DEFAULT true,
 valid_from timestamptz DEFAULT now(), valid_to timestamptz,
 UNIQUE(profile_id, space_id)
);
CREATE TABLE sky_experiment.report_bindings (
 report_id text PRIMARY KEY REFERENCES greenhouse_insights.insight_reports,
 space_id text REFERENCES greenhouse_core.spaces, service_id text REFERENCES greenhouse_core.services
);
