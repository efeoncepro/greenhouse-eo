-- ============================================================================
-- Nubox PostgreSQL Extensions — DTE columns + emission log
-- ============================================================================
-- Extends greenhouse_finance.income and expenses with Nubox DTE tracking.
-- Creates emission audit log table for issuance attempts.
--
-- Prerequisites: greenhouse_finance schema + income/expenses tables must exist
--   (created by setup-postgres-finance-slice2.sql)
-- ============================================================================

-- ── Extend income with DTE tracking ─────────────────────────────────────────

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS nubox_document_id BIGINT;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS nubox_sii_track_id BIGINT;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS nubox_emission_status TEXT;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS dte_type_code TEXT;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS dte_folio TEXT;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS nubox_emitted_at TIMESTAMPTZ;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS nubox_last_synced_at TIMESTAMPTZ;

-- ── Extend expenses with purchase tracking ──────────────────────────────────

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS nubox_purchase_id BIGINT;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS nubox_document_status TEXT;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS nubox_supplier_rut TEXT;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS nubox_supplier_name TEXT;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS nubox_origin TEXT;

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS nubox_last_synced_at TIMESTAMPTZ;

-- ── Emission audit log ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.nubox_emission_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_id TEXT NOT NULL,
  idempotence_id UUID NOT NULL,
  request_payload JSONB NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  nubox_document_id BIGINT,
  emission_status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nubox_emission_log_income
  ON greenhouse_finance.nubox_emission_log (income_id);

CREATE INDEX IF NOT EXISTS idx_nubox_emission_log_created
  ON greenhouse_finance.nubox_emission_log (created_at DESC);
