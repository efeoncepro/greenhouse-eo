-- Up Migration
-- TASK-350 — Quotation-to-Cash Document Chain Bridge
-- Adds explicit FKs linking purchase_orders, service_entry_sheets, and income
-- to the canonical commercial quotation. Replaces the fragile string-based
-- linkage (po_number, hes_number) with explicit references that enable the
-- full chain: cotización → OC → HES → factura.

-- ─── 1. purchase_orders.quotation_id ───
ALTER TABLE greenhouse_finance.purchase_orders
  ADD COLUMN IF NOT EXISTS quotation_id text
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_po_quotation
  ON greenhouse_finance.purchase_orders (quotation_id)
  WHERE quotation_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.purchase_orders.quotation_id IS
  'TASK-350: canonical quotation FK. Nullable because legacy POs predate the bridge; new POs created from a quote get this set.';

-- ─── 2. service_entry_sheets.quotation_id + amount_authorized_clp ───
ALTER TABLE greenhouse_finance.service_entry_sheets
  ADD COLUMN IF NOT EXISTS quotation_id text
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.service_entry_sheets
  ADD COLUMN IF NOT EXISTS amount_authorized_clp numeric(14,2);

CREATE INDEX IF NOT EXISTS idx_hes_quotation
  ON greenhouse_finance.service_entry_sheets (quotation_id)
  WHERE quotation_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.service_entry_sheets.quotation_id IS
  'TASK-350: canonical quotation FK. Can inherit from purchase_order.quotation_id when HES is created from a PO.';

COMMENT ON COLUMN greenhouse_finance.service_entry_sheets.amount_authorized_clp IS
  'TASK-350: amount authorized by this HES. Distinct from amount_clp, which is the submitted/requested value. Used to compute quoted vs authorized drift.';

-- ─── 3. income.quotation_id + source_hes_id ───
ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS quotation_id text
    REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS source_hes_id text
    REFERENCES greenhouse_finance.service_entry_sheets(hes_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_income_quotation
  ON greenhouse_finance.income (quotation_id)
  WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_income_source_hes
  ON greenhouse_finance.income (source_hes_id)
  WHERE source_hes_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.income.quotation_id IS
  'TASK-350: canonical quotation ancestor. Set when income is materialized from an approved quote (simple branch) or from an approved HES (enterprise branch).';

COMMENT ON COLUMN greenhouse_finance.income.source_hes_id IS
  'TASK-350: HES that authorized this income. NULL for simple-branch invoicing (quote → income directly without HES).';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_income_source_hes;
DROP INDEX IF EXISTS greenhouse_finance.idx_income_quotation;
DROP INDEX IF EXISTS greenhouse_finance.idx_hes_quotation;
DROP INDEX IF EXISTS greenhouse_finance.idx_po_quotation;

ALTER TABLE greenhouse_finance.income
  DROP COLUMN IF EXISTS source_hes_id,
  DROP COLUMN IF EXISTS quotation_id;

ALTER TABLE greenhouse_finance.service_entry_sheets
  DROP COLUMN IF EXISTS amount_authorized_clp,
  DROP COLUMN IF EXISTS quotation_id;

ALTER TABLE greenhouse_finance.purchase_orders
  DROP COLUMN IF EXISTS quotation_id;
