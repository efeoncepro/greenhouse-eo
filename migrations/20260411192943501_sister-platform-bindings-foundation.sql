-- Up Migration

CREATE SEQUENCE IF NOT EXISTS greenhouse_core.seq_sister_platform_binding_public_id
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE TABLE IF NOT EXISTS greenhouse_core.sister_platform_bindings (
  sister_platform_binding_id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  sister_platform_key text NOT NULL,
  external_scope_type text NOT NULL,
  external_scope_id text NOT NULL,
  external_scope_parent_id text,
  external_display_name text,
  greenhouse_scope_type text NOT NULL,
  organization_id text,
  client_id text,
  space_id text,
  binding_role text NOT NULL DEFAULT 'primary',
  binding_status text NOT NULL DEFAULT 'draft',
  notes text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_verified_at timestamp with time zone,
  created_by_user_id text,
  activated_by_user_id text,
  suspended_by_user_id text,
  deprecated_by_user_id text,
  activated_at timestamp with time zone,
  suspended_at timestamp with time zone,
  deprecated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sister_platform_bindings_external_scope_type_check CHECK (
    external_scope_type = ANY (
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
  CONSTRAINT sister_platform_bindings_greenhouse_scope_type_check CHECK (
    greenhouse_scope_type = ANY (ARRAY['organization'::text, 'client'::text, 'space'::text, 'internal'::text])
  ),
  CONSTRAINT sister_platform_bindings_role_check CHECK (
    binding_role = ANY (ARRAY['primary'::text, 'secondary'::text, 'observer'::text])
  ),
  CONSTRAINT sister_platform_bindings_status_check CHECK (
    binding_status = ANY (ARRAY['draft'::text, 'active'::text, 'suspended'::text, 'deprecated'::text])
  ),
  CONSTRAINT sister_platform_bindings_scope_consistency_check CHECK (
    (
      greenhouse_scope_type = 'organization'
      AND organization_id IS NOT NULL
      AND client_id IS NULL
      AND space_id IS NULL
    )
    OR (
      greenhouse_scope_type = 'client'
      AND organization_id IS NOT NULL
      AND client_id IS NOT NULL
      AND space_id IS NULL
    )
    OR (
      greenhouse_scope_type = 'space'
      AND organization_id IS NOT NULL
      AND client_id IS NOT NULL
      AND space_id IS NOT NULL
    )
    OR (
      greenhouse_scope_type = 'internal'
      AND organization_id IS NULL
      AND client_id IS NULL
      AND space_id IS NULL
    )
  ),
  CONSTRAINT sister_platform_bindings_status_timestamps_check CHECK (
    (binding_status <> 'active' OR activated_at IS NOT NULL)
    AND (binding_status <> 'suspended' OR suspended_at IS NOT NULL)
    AND (binding_status <> 'deprecated' OR deprecated_at IS NOT NULL)
  )
);

ALTER TABLE greenhouse_core.sister_platform_bindings
  ADD CONSTRAINT sister_platform_bindings_organization_fkey
  FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations (organization_id);

ALTER TABLE greenhouse_core.sister_platform_bindings
  ADD CONSTRAINT sister_platform_bindings_client_fkey
  FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients (client_id);

ALTER TABLE greenhouse_core.sister_platform_bindings
  ADD CONSTRAINT sister_platform_bindings_space_fkey
  FOREIGN KEY (space_id) REFERENCES greenhouse_core.spaces (space_id);

CREATE INDEX IF NOT EXISTS idx_sister_platform_bindings_platform_status
  ON greenhouse_core.sister_platform_bindings (sister_platform_key, binding_status, greenhouse_scope_type);

CREATE INDEX IF NOT EXISTS idx_sister_platform_bindings_external_lookup
  ON greenhouse_core.sister_platform_bindings (sister_platform_key, external_scope_type, external_scope_id);

CREATE INDEX IF NOT EXISTS idx_sister_platform_bindings_org_scope
  ON greenhouse_core.sister_platform_bindings (organization_id, client_id, space_id);

CREATE UNIQUE INDEX IF NOT EXISTS sister_platform_bindings_external_active_unique
  ON greenhouse_core.sister_platform_bindings (
    sister_platform_key,
    external_scope_type,
    external_scope_id,
    binding_role
  )
  WHERE binding_status <> 'deprecated';

ALTER TABLE greenhouse_core.sister_platform_bindings OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_core.seq_sister_platform_binding_public_id OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.sister_platform_bindings TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.seq_sister_platform_binding_public_id TO greenhouse_runtime;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.sister_platform_bindings_external_active_unique;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_bindings_org_scope;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_bindings_external_lookup;
DROP INDEX IF EXISTS greenhouse_core.idx_sister_platform_bindings_platform_status;
DROP TABLE IF EXISTS greenhouse_core.sister_platform_bindings;
DROP SEQUENCE IF EXISTS greenhouse_core.seq_sister_platform_binding_public_id;
