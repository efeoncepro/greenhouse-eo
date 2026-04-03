-- Up Migration

SET search_path = greenhouse_core, public;

-- A. Add SCIM-specific columns to client_users
ALTER TABLE greenhouse_core.client_users
  ADD COLUMN IF NOT EXISTS scim_id text,
  ADD COLUMN IF NOT EXISTS provisioned_by text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provisioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_users_scim_id
  ON greenhouse_core.client_users (scim_id)
  WHERE scim_id IS NOT NULL;

-- B. SCIM tenant mapping — connects Entra tenant to Greenhouse context
CREATE TABLE IF NOT EXISTS greenhouse_core.scim_tenant_mappings (
  scim_tenant_mapping_id text NOT NULL PRIMARY KEY,
  microsoft_tenant_id text NOT NULL,
  tenant_name text,
  client_id text NOT NULL,
  space_id text,
  default_role_code text NOT NULL DEFAULT 'collaborator',
  allowed_email_domains text[] NOT NULL DEFAULT ARRAY[]::text[],
  auto_provision boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_scim_tenant_microsoft_tid UNIQUE (microsoft_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_scim_tenant_mappings_active
  ON greenhouse_core.scim_tenant_mappings (active)
  WHERE active = true;

-- C. SCIM sync log — audit trail for provisioning operations
CREATE TABLE IF NOT EXISTS greenhouse_core.scim_sync_log (
  log_id text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  operation text NOT NULL,
  scim_id text,
  external_id text,
  email text,
  microsoft_tenant_id text,
  request_summary jsonb,
  response_status integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scim_sync_log_created
  ON greenhouse_core.scim_sync_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scim_sync_log_external_id
  ON greenhouse_core.scim_sync_log (external_id)
  WHERE external_id IS NOT NULL;

-- D. Seed: Efeonce internal tenant mapping
INSERT INTO greenhouse_core.scim_tenant_mappings (
  scim_tenant_mapping_id,
  microsoft_tenant_id,
  tenant_name,
  client_id,
  default_role_code,
  allowed_email_domains,
  auto_provision
) VALUES (
  'scim-tm-efeonce',
  'a80bf6c1-7c45-4d70-b043-51389622a0e4',
  'Efeonce Group',
  'efeonce-admin',
  'collaborator',
  ARRAY['efeoncepro.com', 'efeonce.org'],
  true
) ON CONFLICT (microsoft_tenant_id) DO NOTHING;

-- E. Runtime grants
ALTER TABLE greenhouse_core.scim_tenant_mappings OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.scim_sync_log OWNER TO greenhouse_ops;

GRANT SELECT ON greenhouse_core.scim_tenant_mappings TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.client_users TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_core.scim_sync_log TO greenhouse_runtime;

-- Down Migration

SET search_path = greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_core.idx_scim_sync_log_external_id;
DROP INDEX IF EXISTS greenhouse_core.idx_scim_sync_log_created;
DROP TABLE IF EXISTS greenhouse_core.scim_sync_log;

DROP INDEX IF EXISTS greenhouse_core.idx_scim_tenant_mappings_active;
DROP TABLE IF EXISTS greenhouse_core.scim_tenant_mappings;

DROP INDEX IF EXISTS greenhouse_core.idx_client_users_scim_id;
ALTER TABLE greenhouse_core.client_users
  DROP COLUMN IF EXISTS deactivated_at,
  DROP COLUMN IF EXISTS provisioned_at,
  DROP COLUMN IF EXISTS provisioned_by,
  DROP COLUMN IF EXISTS scim_id;
