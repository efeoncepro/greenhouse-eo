-- Up Migration

SET search_path = greenhouse_core, public;

-- SCIM group mirror — maps Entra groups to Greenhouse context
CREATE TABLE IF NOT EXISTS greenhouse_core.scim_groups (
  scim_group_id text NOT NULL PRIMARY KEY,
  microsoft_group_id text NOT NULL,
  display_name text NOT NULL,
  description text,
  group_type text DEFAULT 'security',
  mapped_role_code text,
  mapped_client_id text,
  active boolean NOT NULL DEFAULT true,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_scim_group_ms_id UNIQUE (microsoft_group_id)
);

-- SCIM group membership — tracks which users belong to which groups
CREATE TABLE IF NOT EXISTS greenhouse_core.scim_group_memberships (
  membership_id text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scim_group_id text NOT NULL REFERENCES greenhouse_core.scim_groups(scim_group_id),
  user_id text NOT NULL,
  microsoft_oid text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_scim_group_member UNIQUE (scim_group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_scim_group_memberships_user
  ON greenhouse_core.scim_group_memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_scim_group_memberships_group
  ON greenhouse_core.scim_group_memberships (scim_group_id)
  WHERE active = true;

-- Runtime grants
ALTER TABLE greenhouse_core.scim_groups OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.scim_group_memberships OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_core.scim_groups TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.scim_group_memberships TO greenhouse_runtime;

-- Down Migration

SET search_path = greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_core.idx_scim_group_memberships_group;
DROP INDEX IF EXISTS greenhouse_core.idx_scim_group_memberships_user;
DROP TABLE IF EXISTS greenhouse_core.scim_group_memberships;
DROP TABLE IF EXISTS greenhouse_core.scim_groups;
