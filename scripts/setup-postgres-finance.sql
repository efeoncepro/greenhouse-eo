CREATE SCHEMA IF NOT EXISTS greenhouse_finance;

CREATE TABLE IF NOT EXISTS greenhouse_finance.accounts (
  account_id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  account_number_full TEXT,
  currency TEXT NOT NULL,
  account_type TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'CL',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  opening_balance_date DATE,
  notes TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_accounts_active_idx
  ON greenhouse_finance.accounts (is_active, account_name);

CREATE TABLE IF NOT EXISTS greenhouse_finance.suppliers (
  supplier_id TEXT PRIMARY KEY,
  provider_id TEXT REFERENCES greenhouse_core.providers(provider_id),
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  tax_id TEXT,
  tax_id_type TEXT,
  country_code TEXT NOT NULL DEFAULT 'CL',
  category TEXT NOT NULL,
  service_type TEXT,
  is_international BOOLEAN NOT NULL DEFAULT FALSE,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  website_url TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_type TEXT,
  bank_routing TEXT,
  payment_currency TEXT NOT NULL DEFAULT 'CLP',
  default_payment_terms INTEGER NOT NULL DEFAULT 30,
  default_payment_method TEXT,
  requires_po BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_suppliers_active_idx
  ON greenhouse_finance.suppliers (is_active, legal_name);

CREATE INDEX IF NOT EXISTS finance_suppliers_provider_idx
  ON greenhouse_finance.suppliers (provider_id);

CREATE TABLE IF NOT EXISTS greenhouse_finance.exchange_rates (
  rate_id TEXT PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  rate_date DATE NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT finance_exchange_rates_unique_pair UNIQUE (from_currency, to_currency, rate_date)
);

CREATE INDEX IF NOT EXISTS finance_exchange_rates_pair_idx
  ON greenhouse_finance.exchange_rates (from_currency, to_currency, rate_date DESC);

CREATE OR REPLACE VIEW greenhouse_serving.provider_finance_360 AS
SELECT
  p.provider_id,
  p.public_id,
  p.provider_name,
  p.legal_name AS provider_legal_name,
  p.provider_type,
  p.primary_email AS provider_primary_email,
  p.primary_contact_name AS provider_primary_contact_name,
  p.country_code AS provider_country_code,
  p.status AS provider_status,
  p.active AS provider_active,
  s.supplier_id,
  s.legal_name AS supplier_legal_name,
  s.trade_name AS supplier_trade_name,
  s.category AS supplier_category,
  s.service_type AS supplier_service_type,
  s.payment_currency,
  s.default_payment_terms,
  s.default_payment_method,
  s.requires_po,
  s.is_active AS supplier_active,
  s.created_at AS supplier_created_at,
  s.updated_at AS supplier_updated_at
FROM greenhouse_core.providers AS p
LEFT JOIN greenhouse_finance.suppliers AS s
  ON s.provider_id = p.provider_id;

GRANT USAGE ON SCHEMA greenhouse_finance TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_finance TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_finance TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA greenhouse_finance TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_finance
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_finance
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator;

GRANT SELECT ON greenhouse_serving.provider_finance_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.provider_finance_360 TO greenhouse_migrator;
