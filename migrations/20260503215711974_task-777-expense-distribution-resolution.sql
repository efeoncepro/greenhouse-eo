-- Up Migration

-- TASK-777 — Canonical Expense Distribution Resolution
-- ========================================================================
-- Capa canonica y auditable entre `expenses.economic_category` y los
-- consumidores de management accounting (`member_capacity_economics`,
-- `commercial_cost_attribution`, `operational_pl_snapshots`).
--
-- Regla dura: cash, bancos, conciliacion y payment orders son evidencia
-- read-only. Esta migracion NO muta saldos ni pagos; solo agrega facts de
-- distribucion para impedir que provider payroll, Previred, fees bancarios o
-- costos financieros contaminen el overhead operacional.

CREATE TABLE greenhouse_finance.expense_distribution_policy (
  policy_id                   TEXT PRIMARY KEY,
  period_year                 INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month                INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  policy_version              TEXT NOT NULL,
  operational_overhead_method TEXT NOT NULL DEFAULT 'fte_by_labor'
                                 CHECK (operational_overhead_method IN (
                                   'fte_by_labor',
                                   'revenue_ratio',
                                   'equal_clients',
                                   'manual',
                                   'no_distribution'
                                 )),
  financial_cost_method       TEXT NOT NULL DEFAULT 'no_distribution'
                                 CHECK (financial_cost_method IN (
                                   'below_operating_margin',
                                   'revenue_ratio',
                                   'manual',
                                   'no_distribution'
                                 )),
  regulatory_payment_method   TEXT NOT NULL DEFAULT 'anchor_required'
                                 CHECK (regulatory_payment_method IN (
                                   'anchor_required',
                                   'member_labor_component',
                                   'manual',
                                   'no_distribution'
                                 )),
  status                      TEXT NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'active', 'closed', 'superseded')),
  evidence_json               JSONB NOT NULL DEFAULT '{}'::jsonb,
  declared_by_user_id         TEXT,
  declared_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_by_policy_id     TEXT REFERENCES greenhouse_finance.expense_distribution_policy(policy_id)
                                DEFERRABLE INITIALLY DEFERRED,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expense_distribution_policy_unique_version
    UNIQUE (period_year, period_month, policy_version)
);

CREATE UNIQUE INDEX expense_distribution_policy_active_period_uniq
  ON greenhouse_finance.expense_distribution_policy (period_year, period_month)
  WHERE status = 'active';

COMMENT ON TABLE greenhouse_finance.expense_distribution_policy IS
  'TASK-777: politica versionada por periodo para distribuir shared_operational_overhead, costos financieros y pagos regulatorios. Evita criterios implicitos al cerrar P&L.';

CREATE TABLE greenhouse_finance.expense_distribution_resolution (
  resolution_id               TEXT PRIMARY KEY,
  expense_id                  TEXT NOT NULL REFERENCES greenhouse_finance.expenses(expense_id) ON DELETE CASCADE,
  period_year                 INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month                INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  distribution_lane           TEXT NOT NULL CHECK (distribution_lane IN (
                                 'member_direct_labor',
                                 'member_direct_tool',
                                 'client_direct_non_labor',
                                 'shared_operational_overhead',
                                 'shared_financial_cost',
                                 'regulatory_payment',
                                 'provider_payroll',
                                 'treasury_transit',
                                 'unallocated'
                               )),
  resolution_status           TEXT NOT NULL DEFAULT 'resolved'
                                 CHECK (resolution_status IN (
                                   'resolved',
                                   'manual_required',
                                   'blocked',
                                   'superseded'
                                 )),
  confidence                  TEXT NOT NULL DEFAULT 'medium'
                                 CHECK (confidence IN ('high', 'medium', 'low', 'manual_required')),
  source                      TEXT NOT NULL CHECK (source IN (
                                 'deterministic_resolver',
                                 'manual_override',
                                 'legacy_override',
                                 'ai_approved',
                                 'migration_backfill'
                               )),
  amount_clp                  NUMERIC(14,2) NOT NULL CHECK (amount_clp >= 0),
  basis_amount_clp            NUMERIC(14,2) CHECK (basis_amount_clp IS NULL OR basis_amount_clp >= 0),
  policy_id                   TEXT REFERENCES greenhouse_finance.expense_distribution_policy(policy_id)
                                ON DELETE SET NULL,
  economic_category           TEXT,
  legacy_cost_category        TEXT,
  member_id                   TEXT REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL,
  client_id                   TEXT REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  organization_id             TEXT,
  supplier_id                 TEXT REFERENCES greenhouse_finance.suppliers(supplier_id) ON DELETE SET NULL,
  tool_catalog_id             TEXT REFERENCES greenhouse_ai.tool_catalog(tool_id) ON DELETE SET NULL,
  payroll_entry_id            TEXT,
  payroll_period_id           TEXT,
  payment_obligation_id       TEXT REFERENCES greenhouse_finance.payment_obligations(obligation_id) ON DELETE SET NULL,
  payment_order_id            TEXT REFERENCES greenhouse_finance.payment_orders(order_id) ON DELETE SET NULL,
  payment_order_line_id       TEXT REFERENCES greenhouse_finance.payment_order_lines(line_id) ON DELETE SET NULL,
  evidence_json               JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_flags                  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  resolved_by_user_id         TEXT,
  resolved_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at               TIMESTAMPTZ,
  superseded_by_resolution_id TEXT REFERENCES greenhouse_finance.expense_distribution_resolution(resolution_id)
                                DEFERRABLE INITIALLY DEFERRED,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expense_distribution_resolution_member_anchor
    CHECK (
      distribution_lane NOT IN ('member_direct_labor', 'member_direct_tool')
      OR member_id IS NOT NULL
      OR resolution_status IN ('manual_required', 'blocked', 'superseded')
    ),
  CONSTRAINT expense_distribution_resolution_client_anchor
    CHECK (
      distribution_lane <> 'client_direct_non_labor'
      OR client_id IS NOT NULL
      OR resolution_status IN ('manual_required', 'blocked', 'superseded')
    )
);

CREATE INDEX expense_distribution_resolution_period_lane_idx
  ON greenhouse_finance.expense_distribution_resolution (period_year, period_month, distribution_lane)
  WHERE superseded_at IS NULL;

CREATE UNIQUE INDEX expense_distribution_resolution_period_unique_active
  ON greenhouse_finance.expense_distribution_resolution (expense_id, period_year, period_month)
  WHERE superseded_at IS NULL;

CREATE INDEX expense_distribution_resolution_status_idx
  ON greenhouse_finance.expense_distribution_resolution (resolution_status, period_year, period_month)
  WHERE superseded_at IS NULL;

CREATE INDEX expense_distribution_resolution_expense_idx
  ON greenhouse_finance.expense_distribution_resolution (expense_id, resolved_at DESC);

CREATE INDEX expense_distribution_resolution_member_idx
  ON greenhouse_finance.expense_distribution_resolution (member_id, period_year, period_month)
  WHERE member_id IS NOT NULL AND superseded_at IS NULL;

CREATE INDEX expense_distribution_resolution_client_idx
  ON greenhouse_finance.expense_distribution_resolution (client_id, period_year, period_month)
  WHERE client_id IS NOT NULL AND superseded_at IS NULL;

COMMENT ON TABLE greenhouse_finance.expense_distribution_resolution IS
  'TASK-777: fact canonico activo/versionado que resuelve cada expense a una distribution_lane auditable. Fuente de verdad para shared cost pools y P&L operativo.';

COMMENT ON COLUMN greenhouse_finance.expense_distribution_resolution.distribution_lane IS
  'member_direct_labor/tool, client_direct_non_labor, shared_operational_overhead, shared_financial_cost, regulatory_payment, provider_payroll, treasury_transit o unallocated. Solo shared_operational_overhead entra al pool operacional por defecto.';

CREATE TABLE greenhouse_finance.expense_distribution_ai_suggestions (
  suggestion_id               TEXT PRIMARY KEY,
  expense_id                  TEXT NOT NULL REFERENCES greenhouse_finance.expenses(expense_id) ON DELETE CASCADE,
  period_year                 INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month                INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  suggested_distribution_lane TEXT NOT NULL CHECK (suggested_distribution_lane IN (
                                 'member_direct_labor',
                                 'member_direct_tool',
                                 'client_direct_non_labor',
                                 'shared_operational_overhead',
                                 'shared_financial_cost',
                                 'regulatory_payment',
                                 'provider_payroll',
                                 'treasury_transit',
                                 'unallocated'
                               )),
  suggested_member_id         TEXT,
  suggested_client_id         TEXT,
  confidence                  TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low', 'manual_required')),
  rationale                   TEXT NOT NULL,
  evidence_json               JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_hash                  TEXT NOT NULL,
  prompt_hash                 TEXT NOT NULL,
  model_id                    TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'pending_review'
                                 CHECK (status IN (
                                   'pending_review',
                                   'approved',
                                   'rejected',
                                   'superseded'
                                 )),
  reviewed_by_user_id         TEXT,
  reviewed_at                 TIMESTAMPTZ,
  applied_resolution_id       TEXT REFERENCES greenhouse_finance.expense_distribution_resolution(resolution_id)
                                ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX expense_distribution_ai_suggestions_review_idx
  ON greenhouse_finance.expense_distribution_ai_suggestions (status, created_at)
  WHERE status = 'pending_review';

CREATE INDEX expense_distribution_ai_suggestions_expense_idx
  ON greenhouse_finance.expense_distribution_ai_suggestions (expense_id, created_at DESC);

CREATE UNIQUE INDEX expense_distribution_ai_suggestions_input_model_uniq
  ON greenhouse_finance.expense_distribution_ai_suggestions (expense_id, input_hash, prompt_hash, model_id);

COMMENT ON TABLE greenhouse_finance.expense_distribution_ai_suggestions IS
  'TASK-777: sugerencias IA advisory-only para distribucion de gastos. No mutan P&L ni resoluciones sin aprobacion humana o job explicito.';

CREATE OR REPLACE FUNCTION greenhouse_finance.expense_distribution_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_distribution_policy_touch_updated_at_trigger
  BEFORE UPDATE ON greenhouse_finance.expense_distribution_policy
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.expense_distribution_touch_updated_at();

CREATE TRIGGER expense_distribution_resolution_touch_updated_at_trigger
  BEFORE UPDATE ON greenhouse_finance.expense_distribution_resolution
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.expense_distribution_touch_updated_at();

CREATE TRIGGER expense_distribution_ai_suggestions_touch_updated_at_trigger
  BEFORE UPDATE ON greenhouse_finance.expense_distribution_ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.expense_distribution_touch_updated_at();

CREATE OR REPLACE FUNCTION greenhouse_finance.assert_expense_distribution_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'expense distribution facts are audit-sensitive. Supersede rows instead of deleting.'
    USING ERRCODE = 'feature_not_supported';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_distribution_resolution_no_delete_trigger
  BEFORE DELETE ON greenhouse_finance.expense_distribution_resolution
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.assert_expense_distribution_no_delete();

CREATE TRIGGER expense_distribution_ai_suggestions_no_delete_trigger
  BEFORE DELETE ON greenhouse_finance.expense_distribution_ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.assert_expense_distribution_no_delete();

-- Down Migration

DROP TRIGGER IF EXISTS expense_distribution_ai_suggestions_no_delete_trigger ON greenhouse_finance.expense_distribution_ai_suggestions;
DROP TRIGGER IF EXISTS expense_distribution_resolution_no_delete_trigger ON greenhouse_finance.expense_distribution_resolution;
DROP FUNCTION IF EXISTS greenhouse_finance.assert_expense_distribution_no_delete();
DROP TRIGGER IF EXISTS expense_distribution_ai_suggestions_touch_updated_at_trigger ON greenhouse_finance.expense_distribution_ai_suggestions;
DROP TRIGGER IF EXISTS expense_distribution_resolution_touch_updated_at_trigger ON greenhouse_finance.expense_distribution_resolution;
DROP TRIGGER IF EXISTS expense_distribution_policy_touch_updated_at_trigger ON greenhouse_finance.expense_distribution_policy;
DROP FUNCTION IF EXISTS greenhouse_finance.expense_distribution_touch_updated_at();
DROP TABLE IF EXISTS greenhouse_finance.expense_distribution_ai_suggestions;
DROP TABLE IF EXISTS greenhouse_finance.expense_distribution_resolution;
DROP TABLE IF EXISTS greenhouse_finance.expense_distribution_policy;
