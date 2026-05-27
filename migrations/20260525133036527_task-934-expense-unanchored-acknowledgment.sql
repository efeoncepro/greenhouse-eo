-- Up Migration
--
-- TASK-934 Slice 1 — Acknowledgment-on-expense for unanchored paid expenses.
-- =====================================================================
--
-- A paid expense with NO FK anchor (payroll_entry_id / tool_catalog_id /
-- supplier_id / tax_type / loan_account_id / linked_income_id all NULL) but WITH
-- economic_category is a data-completeness item, not a balance error. TASK-929
-- surfaced 37 of these ($8.2M): 18 vendor_cost_saas (anchorable to supplier via
-- the existing PUT /api/finance/expenses/[id]) and 19 labor/regulatory payments
-- (Daniela España / Andrés-David Colombia / Valentina + regulatory/bank fees)
-- that are people/regulators, NOT suppliers — a supplier_id would be a category
-- error. For those, the canonical resolution is to ACCEPT them as known debt:
-- they are already classified by economic_category for P&L.
--
-- Design (recalibrated 2026-05-25): NO separate review-queue table — that would
-- duplicate the expense state (sync risk). The acknowledgment lives ON the
-- expense row, mirroring dismiss-phantom (superseded_at on the payment). The
-- expense is NOT voided (it stays in P&L); these columns only record "we accept
-- this has no FK anchor; classified via economic_category".

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS unanchored_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unanchored_acknowledged_by TEXT,
  ADD COLUMN IF NOT EXISTS unanchored_acknowledged_reason TEXT;

COMMENT ON COLUMN greenhouse_finance.expenses.unanchored_acknowledged_at IS
'TASK-934: timestamp when an operator accepted this unanchored paid expense as known debt (classified via economic_category, no FK anchor appropriate). NULL = not acknowledged. Set only via acknowledgeUnanchoredExpense() helper. The expense stays in P&L — this is NOT a void/supersede.';

COMMENT ON COLUMN greenhouse_finance.expenses.unanchored_acknowledged_reason IS
'TASK-934: operator reason (>= 10 chars) for accepting the unanchored expense as known debt. Append-only via outbox event finance.expense.unanchored_acknowledged v1.';

-- Capability seed (canonical pattern: catalog + runtime grant live in TS; this
-- row reaches TS<->DB parity, enforced by capabilities-registry parity test).
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'finance.expenses.acknowledge_unanchored',
    'finance',
    ARRAY['update'],
    ARRAY['tenant', 'all'],
    'TASK-934 — Aceptar un gasto pagado sin FK-anchor como deuda conocida (clasificado por economic_category). NO es write-off (el gasto se queda en P&L). FINANCE_ADMIN + EFEONCE_ADMIN.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO NOTHING;

-- Verification (anti pre-up-marker guard): the 3 columns + the capability row
-- must exist post-apply, else abort loudly.
DO $$
DECLARE
  col_count INTEGER;
  cap_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_finance'
    AND table_name = 'expenses'
    AND column_name IN ('unanchored_acknowledged_at', 'unanchored_acknowledged_by', 'unanchored_acknowledged_reason');

  IF col_count <> 3 THEN
    RAISE EXCEPTION 'TASK-934: expected 3 acknowledgment columns on expenses, found %', col_count;
  END IF;

  SELECT COUNT(*) INTO cap_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'finance.expenses.acknowledge_unanchored';

  IF cap_count <> 1 THEN
    RAISE EXCEPTION 'TASK-934: capability finance.expenses.acknowledge_unanchored not seeded (found %)', cap_count;
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.capabilities_registry
  WHERE capability_key = 'finance.expenses.acknowledge_unanchored';

ALTER TABLE greenhouse_finance.expenses
  DROP COLUMN IF EXISTS unanchored_acknowledged_reason,
  DROP COLUMN IF EXISTS unanchored_acknowledged_by,
  DROP COLUMN IF EXISTS unanchored_acknowledged_at;
