-- Up Migration

-- ── TASK-188: Native Integrations Layer — Integration Registry ──
-- Central registry of all native integrations governed by Greenhouse.
-- Layer 1 of the reference architecture defined in GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md.

CREATE TABLE greenhouse_sync.integration_registry (
  integration_key   TEXT        PRIMARY KEY,
  display_name      TEXT        NOT NULL,
  integration_type  TEXT        NOT NULL
    CHECK (integration_type IN ('system_upstream', 'event_provider', 'batch_file', 'api_connector', 'hybrid')),
  source_system     TEXT        NOT NULL,
  description       TEXT,
  owner             TEXT,
  consumer_domains  TEXT[]      NOT NULL DEFAULT '{}',
  auth_mode         TEXT,
  sync_cadence      TEXT,
  environment       TEXT        NOT NULL DEFAULT 'production',
  contract_version  TEXT,
  readiness_status  TEXT        NOT NULL DEFAULT 'unknown'
    CHECK (readiness_status IN ('ready', 'warning', 'blocked', 'unknown')),
  active            BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_sync.integration_registry
  IS 'Central registry of native integrations governed by Greenhouse — TASK-188';

CREATE INDEX idx_integration_registry_active
  ON greenhouse_sync.integration_registry (active)
  WHERE active = TRUE;

-- ── Seed existing integrations ──

INSERT INTO greenhouse_sync.integration_registry
  (integration_key, display_name, integration_type, source_system, description, owner, consumer_domains, auth_mode, sync_cadence, readiness_status, active)
VALUES
  ('notion',   'Notion',   'hybrid',           'notion',   'Delivery databases: projects, tasks, sprints, reviews. Feeds ICO, scorecards and operational reporting.',  'platform', ARRAY['delivery', 'ico', 'agency'],      'oauth2',  '15min',  'ready',   TRUE),
  ('hubspot',  'HubSpot',  'system_upstream',   'hubspot',  'CRM backbone: companies, deals, contacts, services. Feeds CRM module and service provisioning.',         'platform', ARRAY['crm', 'finance', 'agency'],         'api_key', 'hourly', 'ready',   TRUE),
  ('nubox',    'Nubox',    'api_connector',     'nubox',    'Invoicing upstream: sales, purchases, expenses, incomes. Feeds Finance module and P&L engine.',           'platform', ARRAY['finance'],                          'api_key', 'daily',  'ready',   TRUE),
  ('frame_io', 'Frame.io', 'event_provider',    'frame_io', 'Review and approval signals via Notion task fields. No direct API — data arrives through Notion sync.',   'platform', ARRAY['delivery'],                         'none',    'passive','warning', TRUE);

-- ── Grant runtime read access ──
GRANT SELECT ON greenhouse_sync.integration_registry TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_sync.integration_registry;
