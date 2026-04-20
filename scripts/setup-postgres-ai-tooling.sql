CREATE SCHEMA IF NOT EXISTS greenhouse_ai;

CREATE SEQUENCE IF NOT EXISTS greenhouse_ai.tool_sku_seq
  START WITH 27
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_ai.generate_tool_sku()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ETG-' || LPAD(nextval('greenhouse_ai.tool_sku_seq')::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS greenhouse_ai.tool_catalog (
  tool_id TEXT PRIMARY KEY,
  tool_name TEXT NOT NULL,
  provider_id TEXT NOT NULL REFERENCES greenhouse_core.providers(provider_id),
  vendor TEXT,
  tool_category TEXT NOT NULL,
  tool_subcategory TEXT,
  cost_model TEXT NOT NULL,
  tool_sku TEXT,
  subscription_amount NUMERIC,
  subscription_currency TEXT,
  subscription_billing_cycle TEXT,
  subscription_seats INTEGER,
  credit_unit_name TEXT,
  credit_unit_cost NUMERIC,
  credit_unit_currency TEXT,
  credits_included_monthly INTEGER,
  fin_supplier_id TEXT REFERENCES greenhouse_finance.suppliers(supplier_id),
  description TEXT,
  website_url TEXT,
  icon_url TEXT,
  prorating_qty NUMERIC,
  prorating_unit TEXT,
  prorated_cost_usd NUMERIC,
  prorated_price_usd NUMERIC,
  applicable_business_lines TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  applicability_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  includes_in_addon BOOLEAN NOT NULL DEFAULT FALSE,
  notes_for_quoting TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE greenhouse_ai.tool_catalog
  ALTER COLUMN tool_sku SET DEFAULT greenhouse_ai.generate_tool_sku();

CREATE INDEX IF NOT EXISTS greenhouse_ai_tool_catalog_provider_idx
  ON greenhouse_ai.tool_catalog (provider_id);

CREATE INDEX IF NOT EXISTS greenhouse_ai_tool_catalog_active_idx
  ON greenhouse_ai.tool_catalog (is_active, tool_category, sort_order, tool_name);

CREATE UNIQUE INDEX IF NOT EXISTS greenhouse_ai_tool_catalog_tool_sku_idx
  ON greenhouse_ai.tool_catalog (tool_sku)
  WHERE tool_sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS greenhouse_ai_tool_catalog_business_lines_idx
  ON greenhouse_ai.tool_catalog
  USING GIN (applicable_business_lines);

CREATE INDEX IF NOT EXISTS greenhouse_ai_tool_catalog_applicability_tags_idx
  ON greenhouse_ai.tool_catalog
  USING GIN (applicability_tags);

CREATE TABLE IF NOT EXISTS greenhouse_ai.member_tool_licenses (
  license_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  tool_id TEXT NOT NULL REFERENCES greenhouse_ai.tool_catalog(tool_id) ON DELETE CASCADE,
  license_status TEXT NOT NULL,
  activated_at DATE,
  expires_at DATE,
  access_level TEXT,
  license_key TEXT,
  account_email TEXT,
  notes TEXT,
  assigned_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS greenhouse_ai_member_tool_licenses_member_idx
  ON greenhouse_ai.member_tool_licenses (member_id, license_status);

CREATE INDEX IF NOT EXISTS greenhouse_ai_member_tool_licenses_tool_idx
  ON greenhouse_ai.member_tool_licenses (tool_id, license_status);

CREATE TABLE IF NOT EXISTS greenhouse_ai.credit_wallets (
  wallet_id TEXT PRIMARY KEY,
  wallet_name TEXT NOT NULL,
  wallet_scope TEXT NOT NULL,
  client_id TEXT REFERENCES greenhouse_core.clients(client_id),
  tool_id TEXT NOT NULL REFERENCES greenhouse_ai.tool_catalog(tool_id) ON DELETE CASCADE,
  credit_unit_name TEXT NOT NULL,
  initial_balance INTEGER NOT NULL,
  current_balance INTEGER NOT NULL,
  reserved_balance INTEGER NOT NULL DEFAULT 0,
  monthly_limit INTEGER,
  monthly_consumed INTEGER NOT NULL DEFAULT 0,
  monthly_reset_day INTEGER NOT NULL DEFAULT 1,
  low_balance_threshold INTEGER,
  valid_from DATE NOT NULL,
  valid_until DATE,
  wallet_status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS greenhouse_ai_credit_wallets_client_idx
  ON greenhouse_ai.credit_wallets (client_id, wallet_status);

CREATE INDEX IF NOT EXISTS greenhouse_ai_credit_wallets_tool_idx
  ON greenhouse_ai.credit_wallets (tool_id, wallet_status);

CREATE TABLE IF NOT EXISTS greenhouse_ai.credit_ledger (
  ledger_id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES greenhouse_ai.credit_wallets(wallet_id) ON DELETE CASCADE,
  request_id TEXT,
  entry_type TEXT NOT NULL,
  credit_amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  consumed_by_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  client_id TEXT REFERENCES greenhouse_core.clients(client_id),
  notion_task_id TEXT,
  notion_project_id TEXT,
  project_name TEXT,
  asset_description TEXT,
  unit_cost NUMERIC,
  cost_currency TEXT,
  total_cost NUMERIC,
  total_cost_clp NUMERIC,
  reload_reason TEXT,
  reload_reference TEXT,
  notes TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS greenhouse_ai_credit_ledger_wallet_idx
  ON greenhouse_ai.credit_ledger (wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS greenhouse_ai_credit_ledger_member_idx
  ON greenhouse_ai.credit_ledger (consumed_by_member_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS greenhouse_ai_credit_ledger_request_idx
  ON greenhouse_ai.credit_ledger (wallet_id, request_id, entry_type)
  WHERE request_id IS NOT NULL;

GRANT USAGE ON SCHEMA greenhouse_ai TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_ai TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_ai TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA greenhouse_ai TO greenhouse_migrator;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA greenhouse_ai TO greenhouse_runtime;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA greenhouse_ai TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_ai
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_ai
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_ai
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_ai
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO greenhouse_migrator;

INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'postgres-ai-tooling-v1',
  'ai_tooling',
  CURRENT_USER,
  'Creates greenhouse_ai runtime schema for AI Tooling catalog, licenses, wallets and credit ledger.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  migration_group = EXCLUDED.migration_group,
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;
