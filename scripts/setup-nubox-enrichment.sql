-- Greenhouse Finance: Nubox Full Data Enrichment
-- TASK-165: Bring ALL Nubox fields into Greenhouse
-- Run with: migrator or greenhouse_ops credentials

-- ─── Income: new columns ──────────────────────────────────────────────────

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS dte_type_abbreviation TEXT,
  ADD COLUMN IF NOT EXISTS dte_type_name TEXT,
  ADD COLUMN IF NOT EXISTS exempt_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS other_taxes_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS withholding_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS balance_nubox NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_form TEXT,
  ADD COLUMN IF NOT EXISTS payment_form_name TEXT,
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS period_year INT,
  ADD COLUMN IF NOT EXISTS period_month INT,
  ADD COLUMN IF NOT EXISTS nubox_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS nubox_xml_url TEXT,
  ADD COLUMN IF NOT EXISTS nubox_details_url TEXT,
  ADD COLUMN IF NOT EXISTS nubox_references_url TEXT,
  ADD COLUMN IF NOT EXISTS client_main_activity TEXT;

-- ─── Expenses: new columns ────────────────────────────────────────────────

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS is_annulled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sii_document_status TEXT,
  ADD COLUMN IF NOT EXISTS receipt_date DATE,
  ADD COLUMN IF NOT EXISTS purchase_type TEXT,
  ADD COLUMN IF NOT EXISTS balance_nubox NUMERIC,
  ADD COLUMN IF NOT EXISTS vat_unrecoverable_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS vat_fixed_assets_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS vat_common_use_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS nubox_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS dte_type_code TEXT,
  ADD COLUMN IF NOT EXISTS dte_folio TEXT,
  ADD COLUMN IF NOT EXISTS exempt_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS other_taxes_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS withholding_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS period_year INT,
  ADD COLUMN IF NOT EXISTS period_month INT;

-- ─── Income Line Items ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.income_line_items (
  line_item_id TEXT PRIMARY KEY,
  income_id TEXT NOT NULL,
  line_number INT NOT NULL,
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total_amount NUMERIC,
  discount_percent NUMERIC,
  is_exempt BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT line_item_unique UNIQUE (income_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_line_items_income
  ON greenhouse_finance.income_line_items (income_id);

-- ─── Grants ───────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.income_line_items TO runtime;
