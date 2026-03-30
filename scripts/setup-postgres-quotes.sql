-- Greenhouse Finance: Quotes table
-- Stores cotizaciones (DTE 52) separately from income
-- Part of TASK-163: Finance Document Type Separation

CREATE TABLE IF NOT EXISTS greenhouse_finance.quotes (
  quote_id TEXT PRIMARY KEY,
  client_id TEXT,
  organization_id TEXT,
  client_name TEXT,
  quote_number TEXT,
  quote_date DATE,
  due_date DATE,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'CLP',
  subtotal NUMERIC,
  tax_rate NUMERIC DEFAULT 0.19,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  exchange_rate_to_clp NUMERIC DEFAULT 1,
  total_amount_clp NUMERIC,
  status TEXT DEFAULT 'sent',  -- draft, sent, accepted, rejected, expired, converted
  converted_to_income_id TEXT,
  expiry_date DATE,
  -- Nubox metadata
  nubox_document_id TEXT,
  nubox_sii_track_id TEXT,
  nubox_emission_status TEXT,
  dte_type_code TEXT DEFAULT '52',
  dte_folio TEXT,
  nubox_emitted_at TIMESTAMPTZ,
  nubox_last_synced_at TIMESTAMPTZ,
  -- Context
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_client ON greenhouse_finance.quotes (client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON greenhouse_finance.quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_nubox ON greenhouse_finance.quotes (nubox_document_id);

-- Add referenced_income_id to income for credit note → invoice linking
ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS referenced_income_id TEXT;

-- Grants
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.quotes TO runtime;
