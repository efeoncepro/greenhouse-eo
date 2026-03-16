-- ============================================================================
-- Financial Intelligence Layer — Phase 1: Foundation
-- Extends greenhouse_finance schema with cost classification,
-- partner tracking, cost allocations, and client economics.
-- ============================================================================

-- ─── 1a. Expenses: cost classification columns ─────────────────────────────

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS cost_category TEXT DEFAULT 'operational',
  ADD COLUMN IF NOT EXISTS cost_is_direct BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allocated_client_id TEXT;

COMMENT ON COLUMN greenhouse_finance.expenses.cost_category
  IS 'direct_labor | indirect_labor | operational | infrastructure | tax_social';
COMMENT ON COLUMN greenhouse_finance.expenses.cost_is_direct
  IS 'Whether expense is directly attributable to client delivery';
COMMENT ON COLUMN greenhouse_finance.expenses.allocated_client_id
  IS 'FK to greenhouse_core.client_profiles when expense is directly allocated';

-- ─── 1b. Income: partnership columns ───────────────────────────────────────

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS partner_id TEXT,
  ADD COLUMN IF NOT EXISTS partner_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_share_percent NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS partner_share_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS net_after_partner NUMERIC(14,2);

COMMENT ON COLUMN greenhouse_finance.income.partner_id
  IS 'External partner identifier (e.g. HubSpot referral partner)';
COMMENT ON COLUMN greenhouse_finance.income.partner_share_percent
  IS 'Partner revenue share as decimal (0.0000–1.0000)';
COMMENT ON COLUMN greenhouse_finance.income.net_after_partner
  IS 'total_amount minus partner_share_amount';

-- ─── 1c. Cost allocations ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.cost_allocations (
  allocation_id         TEXT PRIMARY KEY,
  expense_id            TEXT NOT NULL REFERENCES greenhouse_finance.expenses(expense_id),
  client_id             TEXT NOT NULL,
  client_name           TEXT NOT NULL,
  allocation_percent    NUMERIC(6,4) NOT NULL CHECK (allocation_percent > 0 AND allocation_percent <= 1),
  allocated_amount_clp  NUMERIC(14,2) NOT NULL,
  period_year           INT NOT NULL,
  period_month          INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  allocation_method     TEXT NOT NULL DEFAULT 'manual',
  notes                 TEXT,
  created_by_user_id    TEXT,
  created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cost_alloc_client
  ON greenhouse_finance.cost_allocations(client_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_cost_alloc_expense
  ON greenhouse_finance.cost_allocations(expense_id);

COMMENT ON TABLE greenhouse_finance.cost_allocations
  IS 'Maps expenses to clients with proportional allocation for P&L attribution';

-- ─── 1d. Client economics snapshots ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.client_economics (
  snapshot_id           TEXT PRIMARY KEY,
  client_id             TEXT NOT NULL,
  client_name           TEXT NOT NULL,
  period_year           INT NOT NULL,
  period_month          INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  total_revenue_clp     NUMERIC(14,2) DEFAULT 0,
  direct_costs_clp      NUMERIC(14,2) DEFAULT 0,
  indirect_costs_clp    NUMERIC(14,2) DEFAULT 0,
  gross_margin_clp      NUMERIC(14,2) DEFAULT 0,
  gross_margin_percent  NUMERIC(6,4),
  net_margin_clp        NUMERIC(14,2) DEFAULT 0,
  net_margin_percent    NUMERIC(6,4),
  headcount_fte         NUMERIC(6,2),
  revenue_per_fte       NUMERIC(14,2),
  cost_per_fte          NUMERIC(14,2),
  notes                 TEXT,
  computed_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_client_econ_period
  ON greenhouse_finance.client_economics(period_year, period_month);

COMMENT ON TABLE greenhouse_finance.client_economics
  IS 'Monthly per-client margin snapshots: revenue, costs, margins, FTE metrics';
