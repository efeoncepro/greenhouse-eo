CREATE TABLE IF NOT EXISTS greenhouse_core.assets (
  asset_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'attached', 'orphaned', 'deleted')),
  bucket_name TEXT NOT NULL,
  object_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  retention_class TEXT NOT NULL,
  owner_aggregate_type TEXT NOT NULL,
  owner_aggregate_id TEXT,
  owner_client_id TEXT,
  owner_space_id TEXT,
  owner_member_id TEXT,
  uploaded_by_user_id TEXT,
  attached_by_user_id TEXT,
  deleted_by_user_id TEXT,
  upload_source TEXT NOT NULL DEFAULT 'user' CHECK (upload_source IN ('user', 'system')),
  download_count INTEGER NOT NULL DEFAULT 0,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attached_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  last_downloaded_at TIMESTAMPTZ,
  CONSTRAINT greenhouse_assets_unique_object UNIQUE (bucket_name, object_path),
  CONSTRAINT greenhouse_assets_owner_client_fk FOREIGN KEY (owner_client_id) REFERENCES greenhouse_core.clients (client_id) ON DELETE SET NULL,
  CONSTRAINT greenhouse_assets_owner_space_fk FOREIGN KEY (owner_space_id) REFERENCES greenhouse_core.spaces (space_id) ON DELETE SET NULL,
  CONSTRAINT greenhouse_assets_owner_member_fk FOREIGN KEY (owner_member_id) REFERENCES greenhouse_core.members (member_id) ON DELETE SET NULL,
  CONSTRAINT greenhouse_assets_uploaded_by_fk FOREIGN KEY (uploaded_by_user_id) REFERENCES greenhouse_core.client_users (user_id) ON DELETE SET NULL,
  CONSTRAINT greenhouse_assets_attached_by_fk FOREIGN KEY (attached_by_user_id) REFERENCES greenhouse_core.client_users (user_id) ON DELETE SET NULL,
  CONSTRAINT greenhouse_assets_deleted_by_fk FOREIGN KEY (deleted_by_user_id) REFERENCES greenhouse_core.client_users (user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS greenhouse_assets_status_idx
  ON greenhouse_core.assets (status, owner_aggregate_type, created_at DESC);

CREATE INDEX IF NOT EXISTS greenhouse_assets_owner_lookup_idx
  ON greenhouse_core.assets (owner_aggregate_type, owner_aggregate_id);

CREATE INDEX IF NOT EXISTS greenhouse_assets_scope_lookup_idx
  ON greenhouse_core.assets (owner_client_id, owner_space_id, owner_member_id);

CREATE TABLE IF NOT EXISTS greenhouse_core.asset_access_log (
  access_log_id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES greenhouse_core.assets (asset_id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('download', 'delete', 'attach', 'upload')),
  actor_user_id TEXT REFERENCES greenhouse_core.client_users (user_id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS greenhouse_asset_access_log_asset_idx
  ON greenhouse_core.asset_access_log (asset_id, occurred_at DESC);

ALTER TABLE greenhouse_hr.leave_requests
  ADD COLUMN IF NOT EXISTS attachment_asset_id TEXT;

ALTER TABLE greenhouse_finance.purchase_orders
  ADD COLUMN IF NOT EXISTS attachment_asset_id TEXT;

ALTER TABLE greenhouse_payroll.payroll_receipts
  ADD COLUMN IF NOT EXISTS asset_id TEXT;

ALTER TABLE greenhouse_payroll.payroll_export_packages
  ADD COLUMN IF NOT EXISTS pdf_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS csv_asset_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'greenhouse_leave_requests_attachment_asset_fk'
  ) THEN
    ALTER TABLE greenhouse_hr.leave_requests
      ADD CONSTRAINT greenhouse_leave_requests_attachment_asset_fk
      FOREIGN KEY (attachment_asset_id) REFERENCES greenhouse_core.assets (asset_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'greenhouse_purchase_orders_attachment_asset_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.purchase_orders
      ADD CONSTRAINT greenhouse_purchase_orders_attachment_asset_fk
      FOREIGN KEY (attachment_asset_id) REFERENCES greenhouse_core.assets (asset_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'greenhouse_payroll_receipts_asset_fk'
  ) THEN
    ALTER TABLE greenhouse_payroll.payroll_receipts
      ADD CONSTRAINT greenhouse_payroll_receipts_asset_fk
      FOREIGN KEY (asset_id) REFERENCES greenhouse_core.assets (asset_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'greenhouse_payroll_export_packages_pdf_asset_fk'
  ) THEN
    ALTER TABLE greenhouse_payroll.payroll_export_packages
      ADD CONSTRAINT greenhouse_payroll_export_packages_pdf_asset_fk
      FOREIGN KEY (pdf_asset_id) REFERENCES greenhouse_core.assets (asset_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'greenhouse_payroll_export_packages_csv_asset_fk'
  ) THEN
    ALTER TABLE greenhouse_payroll.payroll_export_packages
      ADD CONSTRAINT greenhouse_payroll_export_packages_csv_asset_fk
      FOREIGN KEY (csv_asset_id) REFERENCES greenhouse_core.assets (asset_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS leave_requests_attachment_asset_idx
  ON greenhouse_hr.leave_requests (attachment_asset_id);

CREATE INDEX IF NOT EXISTS purchase_orders_attachment_asset_idx
  ON greenhouse_finance.purchase_orders (attachment_asset_id);

CREATE INDEX IF NOT EXISTS payroll_receipts_asset_idx
  ON greenhouse_payroll.payroll_receipts (asset_id);

CREATE INDEX IF NOT EXISTS payroll_export_packages_pdf_asset_idx
  ON greenhouse_payroll.payroll_export_packages (pdf_asset_id);

CREATE INDEX IF NOT EXISTS payroll_export_packages_csv_asset_idx
  ON greenhouse_payroll.payroll_export_packages (csv_asset_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.assets TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.asset_access_log TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.assets TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.asset_access_log TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_core.assets TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_core.asset_access_log TO greenhouse_migrator;

INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'shared-assets-platform-v1',
  'platform',
  CURRENT_USER,
  'Shared attachments registry in greenhouse_core plus bridge columns for leave, finance purchase orders, and payroll artifacts.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  migration_group = EXCLUDED.migration_group,
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;
