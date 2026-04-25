-- Up Migration
-- TASK-531: converge `greenhouse_finance.income` with the canonical Chile tax
-- snapshot contract introduced in TASK-529 and adopted by quotations in
-- TASK-530. The legacy `tax_rate` / `tax_amount` columns remain for backwards
-- compatibility while `tax_code` + `tax_snapshot_json` become the first-class
-- audit trail for invoices/income.

SET search_path = greenhouse_finance, public;

-- ── Income header ─────────────────────────────────────────────────────────

ALTER TABLE greenhouse_finance.income
  ADD COLUMN IF NOT EXISTS tax_code text,
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot numeric(6, 4),
  ADD COLUMN IF NOT EXISTS tax_amount_snapshot numeric(18, 2),
  ADD COLUMN IF NOT EXISTS tax_snapshot_json jsonb,
  ADD COLUMN IF NOT EXISTS is_tax_exempt boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tax_snapshot_frozen_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'income_tax_code_valid'
  ) THEN
    ALTER TABLE greenhouse_finance.income
      ADD CONSTRAINT income_tax_code_valid
      CHECK (
        tax_code IS NULL OR tax_code IN (
          'cl_vat_19',
          'cl_vat_exempt',
          'cl_vat_non_billable'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'income_tax_snapshot_consistent'
  ) THEN
    ALTER TABLE greenhouse_finance.income
      ADD CONSTRAINT income_tax_snapshot_consistent
      CHECK (
        (tax_code IS NULL AND tax_snapshot_json IS NULL AND tax_snapshot_frozen_at IS NULL)
        OR (tax_code IS NOT NULL AND tax_snapshot_json IS NOT NULL AND tax_snapshot_frozen_at IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_income_tax_code
  ON greenhouse_finance.income (tax_code)
  WHERE tax_code IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.income.tax_code IS
  'Canonical Chile tax code applied to the invoice/income (cl_vat_19 / cl_vat_exempt / cl_vat_non_billable). Downstream integrations consume this instead of inferring taxes from raw tax_rate.';

COMMENT ON COLUMN greenhouse_finance.income.tax_snapshot_json IS
  'Frozen ChileTaxSnapshot (version=1) persisted on the financial aggregate. Immutable after issuance/materialization.';

COMMENT ON COLUMN greenhouse_finance.income.is_tax_exempt IS
  'Derived flag for quick filters. True when the applied tax code is exempt or non-billable.';

-- ── Income line items ─────────────────────────────────────────────────────

ALTER TABLE greenhouse_finance.income_line_items
  ADD COLUMN IF NOT EXISTS tax_code text,
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot numeric(6, 4),
  ADD COLUMN IF NOT EXISTS tax_amount_snapshot numeric(18, 2),
  ADD COLUMN IF NOT EXISTS tax_snapshot_json jsonb,
  ADD COLUMN IF NOT EXISTS is_tax_exempt boolean NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'income_line_items_tax_code_valid'
  ) THEN
    ALTER TABLE greenhouse_finance.income_line_items
      ADD CONSTRAINT income_line_items_tax_code_valid
      CHECK (
        tax_code IS NULL OR tax_code IN (
          'cl_vat_19',
          'cl_vat_exempt',
          'cl_vat_non_billable'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'income_line_items_tax_snapshot_consistent'
  ) THEN
    ALTER TABLE greenhouse_finance.income_line_items
      ADD CONSTRAINT income_line_items_tax_snapshot_consistent
      CHECK (
        (tax_code IS NULL AND tax_snapshot_json IS NULL)
        OR (tax_code IS NOT NULL AND tax_snapshot_json IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_income_line_items_tax_code
  ON greenhouse_finance.income_line_items (tax_code)
  WHERE tax_code IS NOT NULL;

-- ── Backfill header from legacy `tax_rate` / `tax_amount` ─────────────────
-- Heuristics:
--   - `tax_amount > 0` or `tax_rate ≈ 0.19` => cl_vat_19
--   - DTE 34 / exempt_amount > 0 / tax_rate = 0 => cl_vat_exempt
--   - missing tax evidence => cl_vat_non_billable

WITH classified AS (
  SELECT
    i.income_id,
    CASE
      WHEN COALESCE(i.tax_amount, 0) > 0 THEN 'cl_vat_19'
      WHEN i.tax_rate IS NOT NULL AND ABS(i.tax_rate - 0.19) < 0.0001 THEN 'cl_vat_19'
      WHEN i.dte_type_code = '34' THEN 'cl_vat_exempt'
      WHEN COALESCE(i.exempt_amount, 0) > 0 THEN 'cl_vat_exempt'
      WHEN i.tax_rate = 0 THEN 'cl_vat_exempt'
      ELSE 'cl_vat_non_billable'
    END AS resolved_code,
    COALESCE(i.subtotal, 0) AS subtotal_amount,
    COALESCE(i.tax_amount, 0) AS tax_amount_legacy,
    COALESCE(i.total_amount, i.subtotal, 0) AS total_amount_legacy,
    COALESCE(i.nubox_emitted_at, i.updated_at, i.created_at, NOW()) AS frozen_at
  FROM greenhouse_finance.income i
  WHERE i.tax_code IS NULL
)
UPDATE greenhouse_finance.income i
SET
  tax_code = c.resolved_code,
  tax_rate_snapshot = CASE
    WHEN c.resolved_code = 'cl_vat_19' THEN 0.1900
    ELSE NULL
  END,
  tax_amount_snapshot = c.tax_amount_legacy,
  is_tax_exempt = c.resolved_code IN ('cl_vat_exempt', 'cl_vat_non_billable'),
  tax_snapshot_frozen_at = c.frozen_at,
  tax_snapshot_json = jsonb_build_object(
    'version', '1',
    'taxCode', c.resolved_code,
    'jurisdiction', 'CL',
    'kind', CASE
      WHEN c.resolved_code = 'cl_vat_19' THEN 'vat_output'
      WHEN c.resolved_code = 'cl_vat_exempt' THEN 'vat_exempt'
      ELSE 'vat_non_billable'
    END,
    'rate', CASE WHEN c.resolved_code = 'cl_vat_19' THEN 0.19 ELSE NULL END,
    'recoverability', 'not_applicable',
    'labelEs', CASE
      WHEN c.resolved_code = 'cl_vat_19' THEN 'IVA 19%'
      WHEN c.resolved_code = 'cl_vat_exempt' THEN 'IVA Exento'
      ELSE 'No Afecto a IVA'
    END,
    'effectiveFrom', '2026-01-01',
    'frozenAt', c.frozen_at::text,
    'taxableAmount', c.subtotal_amount,
    'taxAmount', c.tax_amount_legacy,
    'totalAmount', c.total_amount_legacy,
    'metadata', jsonb_build_object(
      'backfillSource', 'TASK-531',
      'legacyRate', i.tax_rate,
      'legacyDteTypeCode', i.dte_type_code
    )
  )
FROM classified c
WHERE i.income_id = c.income_id;

-- ── Backfill line items from header + `is_exempt` ──────────────────────────
-- Existing line items do not carry enough detail to reconstruct the original
-- tax base perfectly. We persist a conservative inherited snapshot with a
-- metadata flag so downstream consumers know it came from a degraded legacy
-- line-item model.

WITH line_base AS (
  SELECT
    li.line_item_id,
    li.income_id,
    li.line_number,
    COALESCE(li.total_amount, COALESCE(li.quantity, 1) * COALESCE(li.unit_price, 0), 0) AS taxable_amount,
    COALESCE(li.is_exempt, FALSE) AS line_is_exempt,
    i.tax_code AS header_tax_code,
    i.tax_amount_snapshot AS header_tax_amount,
    i.tax_snapshot_frozen_at AS frozen_at,
    SUM(
      CASE
        WHEN COALESCE(li.is_exempt, FALSE) THEN 0
        ELSE COALESCE(li.total_amount, COALESCE(li.quantity, 1) * COALESCE(li.unit_price, 0), 0)
      END
    ) OVER (PARTITION BY li.income_id) AS taxable_sum_by_income
  FROM greenhouse_finance.income_line_items li
  JOIN greenhouse_finance.income i
    ON i.income_id = li.income_id
  WHERE li.tax_code IS NULL
    AND i.tax_code IS NOT NULL
),
line_classified AS (
  SELECT
    lb.line_item_id,
    lb.taxable_amount,
    lb.frozen_at,
    CASE
      WHEN lb.line_is_exempt THEN 'cl_vat_exempt'
      WHEN lb.header_tax_code IS NOT NULL THEN lb.header_tax_code
      ELSE 'cl_vat_non_billable'
    END AS resolved_code,
    CASE
      WHEN lb.line_is_exempt THEN 0
      WHEN lb.header_tax_code = 'cl_vat_19'
        THEN ROUND(
          COALESCE(lb.header_tax_amount, 0)
          * COALESCE(lb.taxable_amount / NULLIF(lb.taxable_sum_by_income, 0), 0),
          2
        )
      ELSE 0
    END AS resolved_tax_amount
  FROM line_base lb
)
UPDATE greenhouse_finance.income_line_items li
SET
  tax_code = lc.resolved_code,
  tax_rate_snapshot = CASE
    WHEN lc.resolved_code = 'cl_vat_19' THEN 0.1900
    ELSE NULL
  END,
  tax_amount_snapshot = lc.resolved_tax_amount,
  is_tax_exempt = lc.resolved_code IN ('cl_vat_exempt', 'cl_vat_non_billable'),
  tax_snapshot_json = jsonb_build_object(
    'version', '1',
    'taxCode', lc.resolved_code,
    'jurisdiction', 'CL',
    'kind', CASE
      WHEN lc.resolved_code = 'cl_vat_19' THEN 'vat_output'
      WHEN lc.resolved_code = 'cl_vat_exempt' THEN 'vat_exempt'
      ELSE 'vat_non_billable'
    END,
    'rate', CASE WHEN lc.resolved_code = 'cl_vat_19' THEN 0.19 ELSE NULL END,
    'recoverability', 'not_applicable',
    'labelEs', CASE
      WHEN lc.resolved_code = 'cl_vat_19' THEN 'IVA 19%'
      WHEN lc.resolved_code = 'cl_vat_exempt' THEN 'IVA Exento'
      ELSE 'No Afecto a IVA'
    END,
    'effectiveFrom', '2026-01-01',
    'frozenAt', COALESCE(lc.frozen_at, NOW())::text,
    'taxableAmount', lc.taxable_amount,
    'taxAmount', lc.resolved_tax_amount,
    'totalAmount', lc.taxable_amount + lc.resolved_tax_amount,
    'metadata', jsonb_build_object(
      'backfillSource', 'TASK-531',
      'degradedLineSource', true,
      'allocatedFromHeaderTaxAmount', true
    )
  )
FROM line_classified lc
WHERE li.line_item_id = lc.line_item_id;

-- Down Migration

SET search_path = greenhouse_finance, public;

DROP INDEX IF EXISTS greenhouse_finance.idx_income_line_items_tax_code;
DROP INDEX IF EXISTS greenhouse_finance.idx_income_tax_code;

ALTER TABLE greenhouse_finance.income_line_items
  DROP CONSTRAINT IF EXISTS income_line_items_tax_snapshot_consistent,
  DROP CONSTRAINT IF EXISTS income_line_items_tax_code_valid;

ALTER TABLE greenhouse_finance.income_line_items
  DROP COLUMN IF EXISTS is_tax_exempt,
  DROP COLUMN IF EXISTS tax_snapshot_json,
  DROP COLUMN IF EXISTS tax_amount_snapshot,
  DROP COLUMN IF EXISTS tax_rate_snapshot,
  DROP COLUMN IF EXISTS tax_code;

ALTER TABLE greenhouse_finance.income
  DROP CONSTRAINT IF EXISTS income_tax_snapshot_consistent,
  DROP CONSTRAINT IF EXISTS income_tax_code_valid;

ALTER TABLE greenhouse_finance.income
  DROP COLUMN IF EXISTS tax_snapshot_frozen_at,
  DROP COLUMN IF EXISTS is_tax_exempt,
  DROP COLUMN IF EXISTS tax_snapshot_json,
  DROP COLUMN IF EXISTS tax_amount_snapshot,
  DROP COLUMN IF EXISTS tax_rate_snapshot,
  DROP COLUMN IF EXISTS tax_code;
