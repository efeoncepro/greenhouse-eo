-- Up Migration

CREATE SCHEMA IF NOT EXISTS greenhouse_context;

CREATE SEQUENCE IF NOT EXISTS greenhouse_context.seq_context_document_public_id
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE TABLE IF NOT EXISTS greenhouse_context.context_documents (
  context_id text PRIMARY KEY DEFAULT ('ctx-' || gen_random_uuid()::text),
  public_id text NOT NULL UNIQUE DEFAULT (
    'EO-CTX-' || lpad(nextval('greenhouse_context.seq_context_document_public_id')::text, 6, '0')
  ),
  owner_aggregate_type text NOT NULL,
  owner_aggregate_id text NOT NULL,
  context_kind text NOT NULL,
  schema_version text NOT NULL DEFAULT 'v1',
  source_system text NOT NULL,
  producer_type text NOT NULL,
  producer_id text,
  space_id text,
  organization_id text,
  client_id text,
  data_classification text NOT NULL DEFAULT 'internal',
  access_scope text NOT NULL DEFAULT 'internal',
  retention_policy_code text NOT NULL DEFAULT 'operational_standard',
  redaction_status text NOT NULL DEFAULT 'not_needed',
  contains_pii boolean NOT NULL DEFAULT false,
  contains_financial_context boolean NOT NULL DEFAULT false,
  contains_secrets boolean NOT NULL DEFAULT false,
  content_hash text NOT NULL,
  idempotency_key text,
  supersedes_context_id text,
  lineage_root_context_id text,
  current_version_number integer NOT NULL DEFAULT 1,
  document_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_bytes integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  archived_at timestamp with time zone,
  created_by_type text,
  created_by_id text,
  updated_by_type text,
  updated_by_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT context_documents_producer_type_check CHECK (
    producer_type = ANY (
      ARRAY['system'::text, 'agent'::text, 'user'::text, 'integration'::text, 'worker'::text, 'migration'::text]
    )
  ),
  CONSTRAINT context_documents_data_classification_check CHECK (
    data_classification = ANY (
      ARRAY['public'::text, 'internal'::text, 'confidential'::text, 'restricted'::text]
    )
  ),
  CONSTRAINT context_documents_access_scope_check CHECK (
    access_scope = ANY (
      ARRAY['internal'::text, 'restricted_ops'::text, 'restricted_finance'::text, 'client_safe'::text]
    )
  ),
  CONSTRAINT context_documents_redaction_status_check CHECK (
    redaction_status = ANY (
      ARRAY['not_needed'::text, 'redacted'::text, 'restricted'::text]
    )
  ),
  CONSTRAINT context_documents_actor_type_check CHECK (
    created_by_type IS NULL
    OR created_by_type = ANY (
      ARRAY['system'::text, 'agent'::text, 'user'::text, 'integration'::text, 'worker'::text, 'migration'::text]
    )
  ),
  CONSTRAINT context_documents_updated_actor_type_check CHECK (
    updated_by_type IS NULL
    OR updated_by_type = ANY (
      ARRAY['system'::text, 'agent'::text, 'user'::text, 'integration'::text, 'worker'::text, 'migration'::text]
    )
  ),
  CONSTRAINT context_documents_document_shape_check CHECK (
    jsonb_typeof(document_jsonb) = 'object'
  ),
  CONSTRAINT context_documents_document_bytes_check CHECK (
    document_bytes >= 0 AND document_bytes <= 262144
  ),
  CONSTRAINT context_documents_no_secret_payload_check CHECK (
    contains_secrets = false
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_context.context_document_versions (
  context_version_id text PRIMARY KEY DEFAULT ('ctxver-' || gen_random_uuid()::text),
  context_id text NOT NULL,
  version_number integer NOT NULL,
  schema_version text NOT NULL,
  content_hash text NOT NULL,
  document_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_bytes integer NOT NULL DEFAULT 0,
  change_reason text,
  changed_by_type text,
  changed_by_id text,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT context_document_versions_document_shape_check CHECK (
    jsonb_typeof(document_jsonb) = 'object'
  ),
  CONSTRAINT context_document_versions_document_bytes_check CHECK (
    document_bytes >= 0 AND document_bytes <= 262144
  ),
  CONSTRAINT context_document_versions_changed_by_type_check CHECK (
    changed_by_type IS NULL
    OR changed_by_type = ANY (
      ARRAY['system'::text, 'agent'::text, 'user'::text, 'integration'::text, 'worker'::text, 'migration'::text]
    )
  ),
  CONSTRAINT context_document_versions_context_version_unique UNIQUE (context_id, version_number)
);

CREATE TABLE IF NOT EXISTS greenhouse_context.context_document_quarantine (
  quarantine_id text PRIMARY KEY DEFAULT ('ctxq-' || gen_random_uuid()::text),
  owner_aggregate_type text,
  owner_aggregate_id text,
  context_kind text,
  source_system text,
  producer_type text,
  producer_id text,
  space_id text,
  organization_id text,
  client_id text,
  validation_errors_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_document_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_bytes integer NOT NULL DEFAULT 0,
  resolution_status text NOT NULL DEFAULT 'open',
  resolution_notes text,
  resolved_by_type text,
  resolved_by_id text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT context_document_quarantine_validation_errors_shape_check CHECK (
    jsonb_typeof(validation_errors_jsonb) = 'array'
  ),
  CONSTRAINT context_document_quarantine_resolution_status_check CHECK (
    resolution_status = ANY (
      ARRAY['open'::text, 'ignored'::text, 'fixed'::text]
    )
  ),
  CONSTRAINT context_document_quarantine_resolved_by_type_check CHECK (
    resolved_by_type IS NULL
    OR resolved_by_type = ANY (
      ARRAY['system'::text, 'agent'::text, 'user'::text, 'integration'::text, 'worker'::text, 'migration'::text]
    )
  ),
  CONSTRAINT context_document_quarantine_payload_bytes_check CHECK (
    payload_bytes >= 0 AND payload_bytes <= 262144
  )
);

ALTER TABLE greenhouse_context.context_documents
  ADD CONSTRAINT context_documents_space_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.spaces (space_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_context.context_documents
  ADD CONSTRAINT context_documents_organization_fkey
  FOREIGN KEY (organization_id)
  REFERENCES greenhouse_core.organizations (organization_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_context.context_documents
  ADD CONSTRAINT context_documents_client_fkey
  FOREIGN KEY (client_id)
  REFERENCES greenhouse_core.clients (client_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_context.context_documents
  ADD CONSTRAINT context_documents_supersedes_fkey
  FOREIGN KEY (supersedes_context_id)
  REFERENCES greenhouse_context.context_documents (context_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_context.context_documents
  ADD CONSTRAINT context_documents_lineage_root_fkey
  FOREIGN KEY (lineage_root_context_id)
  REFERENCES greenhouse_context.context_documents (context_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_context.context_document_versions
  ADD CONSTRAINT context_document_versions_context_fkey
  FOREIGN KEY (context_id)
  REFERENCES greenhouse_context.context_documents (context_id)
  ON DELETE CASCADE;

ALTER TABLE greenhouse_context.context_document_quarantine
  ADD CONSTRAINT context_document_quarantine_space_fkey
  FOREIGN KEY (space_id)
  REFERENCES greenhouse_core.spaces (space_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_context.context_document_quarantine
  ADD CONSTRAINT context_document_quarantine_organization_fkey
  FOREIGN KEY (organization_id)
  REFERENCES greenhouse_core.organizations (organization_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_context.context_document_quarantine
  ADD CONSTRAINT context_document_quarantine_client_fkey
  FOREIGN KEY (client_id)
  REFERENCES greenhouse_core.clients (client_id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_context_documents_owner_kind_idempotency
  ON greenhouse_context.context_documents (
    owner_aggregate_type,
    owner_aggregate_id,
    context_kind,
    idempotency_key
  )
  WHERE idempotency_key IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_context_documents_owner_created_at
  ON greenhouse_context.context_documents (owner_aggregate_type, owner_aggregate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_documents_kind_created_at
  ON greenhouse_context.context_documents (context_kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_documents_scope_lookup
  ON greenhouse_context.context_documents (
    organization_id,
    client_id,
    space_id,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS idx_context_documents_source_system_created_at
  ON greenhouse_context.context_documents (source_system, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_documents_expiry
  ON greenhouse_context.context_documents (expires_at)
  WHERE expires_at IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_context_document_versions_context_created_at
  ON greenhouse_context.context_document_versions (context_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_document_quarantine_status_created_at
  ON greenhouse_context.context_document_quarantine (resolution_status, created_at DESC);

ALTER SCHEMA greenhouse_context OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_context.context_documents OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_context.context_document_versions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_context.context_document_quarantine OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_context.seq_context_document_public_id OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_context TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_context TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_context TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_context.context_documents TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_context.context_document_versions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_context.context_document_quarantine TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_context.seq_context_document_public_id TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_context.context_documents TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_context.context_document_versions TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_context.context_document_quarantine TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_context.seq_context_document_public_id TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_context.context_documents TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_context.context_document_versions TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_context.context_document_quarantine TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_context.seq_context_document_public_id TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_context
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_context
  GRANT USAGE, SELECT ON SEQUENCES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_context
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_app;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_context
  GRANT USAGE, SELECT ON SEQUENCES TO greenhouse_app;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_context
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_context
  GRANT USAGE, SELECT ON SEQUENCES TO greenhouse_migrator;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_context.idx_context_document_quarantine_status_created_at;
DROP INDEX IF EXISTS greenhouse_context.idx_context_document_versions_context_created_at;
DROP INDEX IF EXISTS greenhouse_context.idx_context_documents_expiry;
DROP INDEX IF EXISTS greenhouse_context.idx_context_documents_source_system_created_at;
DROP INDEX IF EXISTS greenhouse_context.idx_context_documents_scope_lookup;
DROP INDEX IF EXISTS greenhouse_context.idx_context_documents_kind_created_at;
DROP INDEX IF EXISTS greenhouse_context.idx_context_documents_owner_created_at;
DROP INDEX IF EXISTS greenhouse_context.idx_context_documents_owner_kind_idempotency;
DROP TABLE IF EXISTS greenhouse_context.context_document_quarantine;
DROP TABLE IF EXISTS greenhouse_context.context_document_versions;
DROP TABLE IF EXISTS greenhouse_context.context_documents;
DROP SEQUENCE IF EXISTS greenhouse_context.seq_context_document_public_id;
DROP SCHEMA IF EXISTS greenhouse_context;
