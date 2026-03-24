-- ============================================================================
-- DTE Reconciliation — Proposals table for Nubox ↔ Finance matching
-- ============================================================================
-- Stores matching proposals between Nubox DTEs and manually-created finance
-- records (income / expenses). Enables automatic matching and admin review.
--
-- Prerequisites:
--   - greenhouse_finance schema must exist (setup-postgres-finance.sql)
--   - greenhouse_sync schema must exist
-- ============================================================================

-- ── Reconciliation proposals ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.dte_reconciliation_proposals (
  proposal_id            TEXT PRIMARY KEY,
  -- DTE source context
  dte_source             TEXT NOT NULL                   -- 'nubox_sale' | 'nubox_purchase'
    CHECK (dte_source IN ('nubox_sale', 'nubox_purchase')),
  dte_source_id          TEXT NOT NULL,                  -- nubox_sale_id or nubox_purchase_id
  dte_folio              TEXT,
  dte_type_code          TEXT,
  dte_total_amount       NUMERIC(18,2),
  dte_emission_date      DATE,
  dte_counterpart_rut    TEXT,                           -- client RUT or supplier RUT
  dte_counterpart_name   TEXT,
  -- Matched finance record
  finance_type           TEXT NOT NULL                   -- 'income' | 'expense'
    CHECK (finance_type IN ('income', 'expense')),
  finance_id             TEXT,                           -- matched income_id or expense_id (nullable if orphan)
  finance_total_amount   NUMERIC(18,2),
  amount_discrepancy     NUMERIC(18,2),                  -- dte_amount - finance_amount
  -- Matching
  confidence             NUMERIC(4,3) NOT NULL DEFAULT 0,
  match_signals          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Resolution
  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'auto_matched', 'approved', 'rejected', 'orphan')),
  resolved_by            TEXT,
  resolved_at            TIMESTAMPTZ,
  -- Lifecycle
  sync_run_id            TEXT,
  organization_id        TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Prevent duplicate proposals for the same DTE in pending/auto_matched state
CREATE UNIQUE INDEX IF NOT EXISTS idx_dte_recon_active_source
  ON greenhouse_finance.dte_reconciliation_proposals (dte_source, dte_source_id)
  WHERE status IN ('pending', 'auto_matched');

-- Admin queue lookup
CREATE INDEX IF NOT EXISTS idx_dte_recon_status
  ON greenhouse_finance.dte_reconciliation_proposals (status, created_at DESC);

-- Organization lookup for coverage queries
CREATE INDEX IF NOT EXISTS idx_dte_recon_org
  ON greenhouse_finance.dte_reconciliation_proposals (organization_id, status);

-- Finance record lookup for deduplication
CREATE INDEX IF NOT EXISTS idx_dte_recon_finance
  ON greenhouse_finance.dte_reconciliation_proposals (finance_type, finance_id)
  WHERE finance_id IS NOT NULL;
