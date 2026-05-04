-- Up Migration
-- SCIM internal Efeonce provisioning was seeded with legacy
-- client_id='efeonce-admin'. That value is not a row in greenhouse_core.clients;
-- internal users are represented with tenant_type='efeonce_internal' and
-- client_id=NULL. Keeping the legacy value makes Entra CREATE operations fail
-- with client_users_client_id_fkey.

ALTER TABLE greenhouse_core.scim_tenant_mappings
  ALTER COLUMN client_id DROP NOT NULL;

UPDATE greenhouse_core.scim_tenant_mappings
   SET client_id = NULL,
       updated_at = CURRENT_TIMESTAMP
 WHERE scim_tenant_mapping_id = 'scim-tm-efeonce'
   AND microsoft_tenant_id = 'a80bf6c1-7c45-4d70-b043-51389622a0e4'
   AND client_id = 'efeonce-admin';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'scim_tenant_mappings_client_id_fkey'
       AND conrelid = 'greenhouse_core.scim_tenant_mappings'::regclass
  ) THEN
    ALTER TABLE greenhouse_core.scim_tenant_mappings
      ADD CONSTRAINT scim_tenant_mappings_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES greenhouse_core.clients(client_id);
  END IF;
END
$$;

COMMENT ON COLUMN greenhouse_core.scim_tenant_mappings.client_id IS
'Nullable Greenhouse client scope for SCIM provisioning. NULL means internal Efeonce tenant; non-NULL must reference greenhouse_core.clients(client_id).';

-- Down Migration
ALTER TABLE greenhouse_core.scim_tenant_mappings
  DROP CONSTRAINT IF EXISTS scim_tenant_mappings_client_id_fkey;

UPDATE greenhouse_core.scim_tenant_mappings
   SET client_id = 'efeonce-admin',
       updated_at = CURRENT_TIMESTAMP
 WHERE scim_tenant_mapping_id = 'scim-tm-efeonce'
   AND microsoft_tenant_id = 'a80bf6c1-7c45-4d70-b043-51389622a0e4'
   AND client_id IS NULL;

ALTER TABLE greenhouse_core.scim_tenant_mappings
  ALTER COLUMN client_id SET NOT NULL;
