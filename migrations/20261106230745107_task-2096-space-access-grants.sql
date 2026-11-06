-- Up Migration
--
-- TASK-2096 — persisted per-Space authority (operational accounts, ADR model B).
--
-- A person (identity profile) may operate one or several Spaces of the same Organization, with a
-- verb set per Space. This is authority over the operational account, NOT a capability: role and
-- capability checks stay with their consumers. A grant never moves or reinterprets history.
--
-- Rules carried by the schema:
--   * one ACTIVE grant per (profile, Space); revocation flips `active`, bumps `version` and keeps
--     the row (no DELETE grant to runtime), so a context selected under an old version can be
--     detected as stale;
--   * verbs are a closed vocabulary (read, create);
--   * the validity window is explicit; an inactive row must say when it was revoked.
-- Clients with a single active Space and no grant keep today's behaviour through the resolver
-- (src/lib/tenant/space-authority); no backfill is needed or performed.

CREATE TABLE IF NOT EXISTS greenhouse_core.space_access_grants (
  grant_id text PRIMARY KEY DEFAULT ('sag-' || gen_random_uuid()::text),
  identity_profile_id text NOT NULL REFERENCES greenhouse_core.identity_profiles(profile_id),
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  space_id text NOT NULL REFERENCES greenhouse_core.spaces(space_id),
  verbs text[] NOT NULL,
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  reason text NOT NULL,
  granted_by text NOT NULL,
  revoked_by text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT space_access_grants_verbs_check
    CHECK (cardinality(verbs) > 0 AND verbs <@ ARRAY['read', 'create']::text[]),
  CONSTRAINT space_access_grants_window_check
    CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT space_access_grants_version_check
    CHECK (version >= 1),
  CONSTRAINT space_access_grants_reason_check
    CHECK (length(btrim(reason)) >= 10),
  CONSTRAINT space_access_grants_revocation_check
    CHECK (active OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS space_access_grants_one_active_per_profile_space
  ON greenhouse_core.space_access_grants (identity_profile_id, space_id)
  WHERE active;

CREATE INDEX IF NOT EXISTS space_access_grants_profile_org_active
  ON greenhouse_core.space_access_grants (identity_profile_id, organization_id)
  WHERE active;

COMMENT ON TABLE greenhouse_core.space_access_grants IS
  'TASK-2096: per-Space authority of a person (identity profile) over an operational account. Written only through src/lib/tenant/space-authority/grants-store.ts.';

-- Anti pre-up-marker guard: abort unless the table and its partial unique index exist.
DO $$
BEGIN
  IF to_regclass('greenhouse_core.space_access_grants') IS NULL THEN
    RAISE EXCEPTION 'TASK-2096 anti pre-up-marker check: greenhouse_core.space_access_grants was NOT created.';
  END IF;

  IF to_regclass('greenhouse_core.space_access_grants_one_active_per_profile_space') IS NULL THEN
    RAISE EXCEPTION 'TASK-2096 anti pre-up-marker check: one-active-grant index was NOT created.';
  END IF;
END
$$;

-- Runtime may read, grant and revoke (UPDATE); it may never DELETE a grant.
-- Default privileges in greenhouse_core may add DELETE/TRUNCATE; remove them explicitly.
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.space_access_grants TO greenhouse_runtime;
REVOKE DELETE, TRUNCATE ON greenhouse_core.space_access_grants FROM greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.space_access_grants;
