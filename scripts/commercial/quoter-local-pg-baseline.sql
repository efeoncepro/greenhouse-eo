-- Minimal stand-in for the platform objects the quoter migrations reference (TASK-2025).
--
-- Loaded only into the throwaway template database of the LOCAL cluster by
-- scripts/commercial/quoter-local-pg.mjs. It is not a migration and never runs against the shared instance.
--
-- The shapes are copied from their owners so a quoter migration meets locally what it meets in production:
--   greenhouse_core.organizations                 docs/architecture/schema-snapshot-baseline.sql + TASK-535 lifecycle
--   greenhouse_core.capabilities_registry         migrations/20260508104217939_task-611-capabilities-registry.sql
--   greenhouse_core.api_platform_command_executions  migrations/20260615181918477_task-655-…sql
--   greenhouse_sync.outbox_events                 docs/architecture/schema-snapshot-baseline.sql
--
-- Ownership mirrors production: greenhouse_ops owns everything and is NOT a superuser, so a migration that needs
-- a privilege it would not have in production fails here too. greenhouse_runtime gets what the runtime has.

CREATE SCHEMA greenhouse_core AUTHORIZATION greenhouse_ops;
CREATE SCHEMA greenhouse_sync AUTHORIZATION greenhouse_ops;
CREATE SCHEMA greenhouse_commercial AUTHORIZATION greenhouse_ops;

-- Los privilegios por defecto del esquema en producción (migrations/…task-345…sql): toda tabla nueva de
-- greenhouse_ops nace con SELECT, INSERT, UPDATE y DELETE para el runtime. Copiados aquí para que una migración que
-- olvide quitarlos falle en local donde fallaría en producción.
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT SELECT ON TABLES TO greenhouse_app;

SET ROLE greenhouse_ops;

CREATE TABLE greenhouse_core.organizations (
  organization_id text PRIMARY KEY,
  public_id text UNIQUE,
  organization_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  active boolean NOT NULL DEFAULT true,
  organization_type text DEFAULT 'other',
  is_operating_entity boolean NOT NULL DEFAULT false,
  lifecycle_stage text NOT NULL DEFAULT 'prospect',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT organizations_type_check CHECK (organization_type IN ('client', 'supplier', 'both', 'other')),
  CONSTRAINT organizations_lifecycle_stage_valid CHECK (
    lifecycle_stage IN ('prospect', 'opportunity', 'active_client', 'inactive', 'churned', 'provider_only', 'disqualified')
  )
);

CREATE TABLE greenhouse_core.capabilities_registry (
  capability_key text PRIMARY KEY,
  module text NOT NULL,
  allowed_actions text[] NOT NULL,
  allowed_scopes text[] NOT NULL,
  description text NOT NULL,
  introduced_at timestamptz NOT NULL DEFAULT now(),
  deprecated_at timestamptz
);

CREATE TABLE greenhouse_core.api_platform_command_executions (
  command_execution_id text PRIMARY KEY,
  lane text NOT NULL,
  principal_kind text NOT NULL,
  principal_id text NOT NULL,
  consumer_id text,
  app_session_id text,
  user_id text,
  route_key text NOT NULL,
  request_method text NOT NULL,
  request_path text NOT NULL,
  idempotency_key text,
  request_fingerprint text,
  status text NOT NULL DEFAULT 'processing',
  response_status integer,
  response_body jsonb,
  error_code text,
  replay_count integer NOT NULL DEFAULT 0,
  greenhouse_scope_type text,
  organization_id text,
  client_id text,
  space_id text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz
);

CREATE TABLE greenhouse_sync.outbox_events (
  event_id text PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at timestamptz
);

GRANT USAGE ON SCHEMA greenhouse_core, greenhouse_sync, greenhouse_commercial TO greenhouse_runtime;
GRANT SELECT ON greenhouse_core.organizations, greenhouse_core.capabilities_registry TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.api_platform_command_executions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_sync.outbox_events TO greenhouse_runtime;

-- Fixture organizations. Synthetic ids and names: the canonical one is found by its public id, as in production.
INSERT INTO greenhouse_core.organizations
  (organization_id, public_id, organization_name, status, active, organization_type, is_operating_entity, lifecycle_stage)
VALUES
  ('org-local-efeonce', 'EO-ORG-0007', 'Efeonce (local fixture)', 'active', true, 'other', true, 'provider_only'),
  ('org-local-client', 'EO-ORG-9001', 'Client (local fixture)', 'active', true, 'client', false, 'active_client'),
  ('org-local-prospect', 'EO-ORG-9002', 'Prospect (local fixture)', 'active', true, 'client', false, 'prospect'),
  ('org-local-other-client', 'EO-ORG-9003', 'Other client (local fixture)', 'active', true, 'client', false, 'opportunity');

RESET ROLE;
