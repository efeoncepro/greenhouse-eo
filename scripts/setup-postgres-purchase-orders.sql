-- Greenhouse Finance: Purchase Orders (OC) & Service Entry Sheets (HES)
-- TASK-164: OC/HES as independent financial objects
-- Run with: migrator or greenhouse_ops credentials

-- ─── Purchase Orders ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.purchase_orders (
  po_id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL,
  client_id TEXT NOT NULL,
  organization_id TEXT,
  space_id TEXT,

  -- Amounts
  authorized_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  exchange_rate_to_clp NUMERIC DEFAULT 1,
  authorized_amount_clp NUMERIC NOT NULL,

  -- Consumption
  invoiced_amount_clp NUMERIC DEFAULT 0,
  remaining_amount_clp NUMERIC,
  invoice_count INT DEFAULT 0,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'active',
  issue_date DATE NOT NULL,
  expiry_date DATE,
  received_at TIMESTAMPTZ DEFAULT now(),

  -- Context
  description TEXT,
  service_scope TEXT,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  attachment_url TEXT,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT po_number_client_unique UNIQUE (po_number, client_id)
);

CREATE INDEX IF NOT EXISTS idx_po_client_status
  ON greenhouse_finance.purchase_orders (client_id, status);
CREATE INDEX IF NOT EXISTS idx_po_expiry
  ON greenhouse_finance.purchase_orders (expiry_date)
  WHERE status = 'active';

-- ─── Service Entry Sheets (HES) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.service_entry_sheets (
  hes_id TEXT PRIMARY KEY,
  hes_number TEXT NOT NULL,
  purchase_order_id TEXT REFERENCES greenhouse_finance.purchase_orders(po_id),
  client_id TEXT NOT NULL,
  organization_id TEXT,
  space_id TEXT,

  -- Service certified
  service_description TEXT NOT NULL,
  service_period_start DATE,
  service_period_end DATE,
  deliverables_summary TEXT,

  -- Amounts
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CLP',
  amount_clp NUMERIC NOT NULL,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejection_reason TEXT,

  -- Link to invoice
  income_id TEXT,
  invoiced BOOLEAN DEFAULT FALSE,

  -- Context
  client_contact_name TEXT,
  client_contact_email TEXT,
  attachment_url TEXT,
  notes TEXT,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT hes_number_client_unique UNIQUE (hes_number, client_id)
);

CREATE INDEX IF NOT EXISTS idx_hes_client_status
  ON greenhouse_finance.service_entry_sheets (client_id, status);
CREATE INDEX IF NOT EXISTS idx_hes_po
  ON greenhouse_finance.service_entry_sheets (purchase_order_id);

-- ─── Link income to PO and HES ───────────────────────────────────────────

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS purchase_order_id TEXT,
  ADD COLUMN IF NOT EXISTS hes_id TEXT;

-- ─── Client profile billing flags ─────────────────────────────────────────

-- client_profiles may not exist yet — use income's client context instead
-- These flags live on the PO/HES tables themselves for now

-- ─── Grants ───────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.purchase_orders TO runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.service_entry_sheets TO runtime;
