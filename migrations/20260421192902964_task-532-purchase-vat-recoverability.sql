-- Up Migration

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS tax_code text,
  ADD COLUMN IF NOT EXISTS tax_recoverability text,
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot numeric,
  ADD COLUMN IF NOT EXISTS tax_amount_snapshot numeric,
  ADD COLUMN IF NOT EXISTS tax_snapshot_json jsonb,
  ADD COLUMN IF NOT EXISTS is_tax_exempt boolean,
  ADD COLUMN IF NOT EXISTS tax_snapshot_frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS recoverable_tax_amount numeric,
  ADD COLUMN IF NOT EXISTS recoverable_tax_amount_clp numeric,
  ADD COLUMN IF NOT EXISTS non_recoverable_tax_amount numeric,
  ADD COLUMN IF NOT EXISTS non_recoverable_tax_amount_clp numeric,
  ADD COLUMN IF NOT EXISTS effective_cost_amount numeric,
  ADD COLUMN IF NOT EXISTS effective_cost_amount_clp numeric;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_tax_code_valid'
  ) THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT expenses_tax_code_valid
      CHECK (
        tax_code IS NULL OR tax_code IN (
          'cl_input_vat_credit_19',
          'cl_input_vat_non_recoverable_19',
          'cl_vat_exempt',
          'cl_vat_non_billable'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_tax_recoverability_valid'
  ) THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT expenses_tax_recoverability_valid
      CHECK (
        tax_recoverability IS NULL OR tax_recoverability IN (
          'full',
          'partial',
          'none',
          'not_applicable'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_tax_snapshot_consistent'
  ) THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT expenses_tax_snapshot_consistent
      CHECK (
        (tax_code IS NULL AND tax_snapshot_json IS NULL AND tax_snapshot_frozen_at IS NULL)
        OR (tax_code IS NOT NULL AND tax_snapshot_json IS NOT NULL AND tax_snapshot_frozen_at IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_tax_code
  ON greenhouse_finance.expenses (tax_code)
  WHERE tax_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_tax_recoverability
  ON greenhouse_finance.expenses (tax_recoverability)
  WHERE tax_recoverability IS NOT NULL;

WITH classified AS (
  SELECT
    e.expense_id,
    COALESCE(e.updated_at, e.created_at, NOW()) AS frozen_at,
    COALESCE(e.subtotal, 0) AS subtotal_amount,
    COALESCE(e.tax_amount, 0) AS tax_amount_legacy,
    COALESCE(e.exchange_rate_to_clp, 1) AS fx_rate,
    COALESCE(e.vat_unrecoverable_amount, 0) AS vat_unrecoverable_amount_legacy,
    COALESCE(e.vat_common_use_amount, 0) AS vat_common_use_amount_legacy,
    COALESCE(e.vat_fixed_assets_amount, 0) AS vat_fixed_assets_amount_legacy,
    CASE
      WHEN COALESCE(e.exempt_amount, 0) > 0 OR e.dte_type_code = '34' THEN 'cl_vat_exempt'
      WHEN COALESCE(e.vat_unrecoverable_amount, 0) > 0 THEN 'cl_input_vat_non_recoverable_19'
      WHEN COALESCE(e.tax_amount, 0) > 0
        OR COALESCE(e.tax_rate, 0) > 0
        OR COALESCE(e.total_amount, 0) > COALESCE(e.subtotal, 0)
        THEN 'cl_input_vat_credit_19'
      ELSE 'cl_vat_non_billable'
    END AS resolved_code,
    CASE
      WHEN COALESCE(e.exempt_amount, 0) > 0 OR e.dte_type_code = '34' THEN 'not_applicable'
      WHEN COALESCE(e.vat_unrecoverable_amount, 0) >= COALESCE(e.tax_amount, 0)
        AND COALESCE(e.tax_amount, 0) > 0 THEN 'none'
      WHEN (
        COALESCE(e.vat_unrecoverable_amount, 0) > 0
        AND COALESCE(e.vat_unrecoverable_amount, 0) < COALESCE(e.tax_amount, 0)
      ) OR COALESCE(e.vat_common_use_amount, 0) > 0 THEN 'partial'
      WHEN COALESCE(e.tax_amount, 0) > 0
        OR COALESCE(e.tax_rate, 0) > 0
        OR COALESCE(e.total_amount, 0) > COALESCE(e.subtotal, 0)
        THEN 'full'
      ELSE 'not_applicable'
    END AS resolved_recoverability
  FROM greenhouse_finance.expenses AS e
)
UPDATE greenhouse_finance.expenses AS e
SET
  tax_code = COALESCE(e.tax_code, c.resolved_code),
  tax_recoverability = COALESCE(e.tax_recoverability, c.resolved_recoverability),
  tax_rate_snapshot = COALESCE(
    e.tax_rate_snapshot,
    CASE
      WHEN c.resolved_code IN ('cl_input_vat_credit_19', 'cl_input_vat_non_recoverable_19') THEN 0.19
      ELSE NULL
    END
  ),
  tax_amount_snapshot = COALESCE(e.tax_amount_snapshot, c.tax_amount_legacy),
  is_tax_exempt = COALESCE(e.is_tax_exempt, c.resolved_code IN ('cl_vat_exempt', 'cl_vat_non_billable')),
  tax_snapshot_frozen_at = COALESCE(e.tax_snapshot_frozen_at, c.frozen_at),
  tax_snapshot_json = COALESCE(
    e.tax_snapshot_json,
    jsonb_build_object(
      'version', '1',
      'taxCode', c.resolved_code,
      'jurisdiction', 'CL',
      'kind', CASE
        WHEN c.resolved_code = 'cl_input_vat_credit_19' THEN 'vat_input_credit'
        WHEN c.resolved_code = 'cl_input_vat_non_recoverable_19' THEN 'vat_input_non_recoverable'
        WHEN c.resolved_code = 'cl_vat_exempt' THEN 'vat_exempt'
        ELSE 'vat_non_billable'
      END,
      'rate', CASE
        WHEN c.resolved_code IN ('cl_input_vat_credit_19', 'cl_input_vat_non_recoverable_19') THEN to_jsonb(0.19)
        ELSE 'null'::jsonb
      END,
      'recoverability', c.resolved_recoverability,
      'labelEs', CASE
        WHEN c.resolved_code = 'cl_input_vat_credit_19' THEN 'IVA credito fiscal 19%'
        WHEN c.resolved_code = 'cl_input_vat_non_recoverable_19' THEN 'IVA no recuperable 19%'
        WHEN c.resolved_code = 'cl_vat_exempt' THEN 'IVA exento'
        ELSE 'No afecto a IVA'
      END,
      'effectiveFrom', '2026-01-01',
      'frozenAt', c.frozen_at,
      'taxableAmount', ROUND(c.subtotal_amount, 2),
      'taxAmount', ROUND(c.tax_amount_legacy, 2),
      'totalAmount', ROUND(c.subtotal_amount + c.tax_amount_legacy, 2),
      'metadata', jsonb_build_object(
        'source', 'task-532-backfill',
        'vatUnrecoverableAmount', ROUND(c.vat_unrecoverable_amount_legacy, 2),
        'vatCommonUseAmount', ROUND(c.vat_common_use_amount_legacy, 2),
        'vatFixedAssetsAmount', ROUND(c.vat_fixed_assets_amount_legacy, 2)
      )
    )
  ),
  non_recoverable_tax_amount = COALESCE(
    e.non_recoverable_tax_amount,
    CASE
      WHEN c.resolved_recoverability = 'none' THEN ROUND(c.tax_amount_legacy, 2)
      WHEN c.resolved_recoverability = 'partial' THEN ROUND(LEAST(c.tax_amount_legacy, c.vat_unrecoverable_amount_legacy), 2)
      ELSE 0
    END
  ),
  recoverable_tax_amount = COALESCE(
    e.recoverable_tax_amount,
    CASE
      WHEN c.resolved_recoverability = 'not_applicable' THEN 0
      WHEN c.resolved_recoverability = 'none' THEN 0
      WHEN c.resolved_recoverability = 'partial'
        THEN ROUND(GREATEST(c.tax_amount_legacy - LEAST(c.tax_amount_legacy, c.vat_unrecoverable_amount_legacy), 0), 2)
      ELSE ROUND(c.tax_amount_legacy, 2)
    END
  ),
  effective_cost_amount = COALESCE(
    e.effective_cost_amount,
    ROUND(
      c.subtotal_amount + CASE
        WHEN c.resolved_recoverability = 'none' THEN c.tax_amount_legacy
        WHEN c.resolved_recoverability = 'partial' THEN LEAST(c.tax_amount_legacy, c.vat_unrecoverable_amount_legacy)
        ELSE 0
      END,
      2
    )
  ),
  non_recoverable_tax_amount_clp = COALESCE(
    e.non_recoverable_tax_amount_clp,
    ROUND(
      (
        CASE
          WHEN c.resolved_recoverability = 'none' THEN c.tax_amount_legacy
          WHEN c.resolved_recoverability = 'partial' THEN LEAST(c.tax_amount_legacy, c.vat_unrecoverable_amount_legacy)
          ELSE 0
        END
      ) * c.fx_rate,
      2
    )
  ),
  recoverable_tax_amount_clp = COALESCE(
    e.recoverable_tax_amount_clp,
    ROUND(
      (
        CASE
          WHEN c.resolved_recoverability = 'not_applicable' THEN 0
          WHEN c.resolved_recoverability = 'none' THEN 0
          WHEN c.resolved_recoverability = 'partial'
            THEN GREATEST(c.tax_amount_legacy - LEAST(c.tax_amount_legacy, c.vat_unrecoverable_amount_legacy), 0)
          ELSE c.tax_amount_legacy
        END
      ) * c.fx_rate,
      2
    )
  ),
  effective_cost_amount_clp = COALESCE(
    e.effective_cost_amount_clp,
    ROUND(
      (
        c.subtotal_amount + CASE
          WHEN c.resolved_recoverability = 'none' THEN c.tax_amount_legacy
          WHEN c.resolved_recoverability = 'partial' THEN LEAST(c.tax_amount_legacy, c.vat_unrecoverable_amount_legacy)
          ELSE 0
        END
      ) * c.fx_rate,
      2
    )
  )
FROM classified AS c
WHERE c.expense_id = e.expense_id;

COMMENT ON COLUMN greenhouse_finance.expenses.tax_code IS
  'Canonical purchase tax code. Mirrors greenhouse_finance.tax_codes and replaces tax_rate as first-class semantics for expenses.';

COMMENT ON COLUMN greenhouse_finance.expenses.tax_recoverability IS
  'Resolved recoverability persisted on the expense row for fast filters and downstream cost consumers.';

COMMENT ON COLUMN greenhouse_finance.expenses.tax_snapshot_json IS
  'Frozen ChileTaxSnapshot (version=1) for purchases. Never re-derived from live catalog at read time.';

COMMENT ON COLUMN greenhouse_finance.expenses.recoverable_tax_amount IS
  'Portion of expense tax amount that remains fiscal credit and must not inflate operational cost.';

COMMENT ON COLUMN greenhouse_finance.expenses.non_recoverable_tax_amount IS
  'Portion of expense tax amount capitalized into cost/gasto.';

COMMENT ON COLUMN greenhouse_finance.expenses.effective_cost_amount IS
  'Canonical operational cost in document currency: subtotal + non_recoverable_tax_amount.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_expenses_tax_recoverability;
DROP INDEX IF EXISTS greenhouse_finance.idx_expenses_tax_code;

ALTER TABLE greenhouse_finance.expenses
  DROP CONSTRAINT IF EXISTS expenses_tax_snapshot_consistent,
  DROP CONSTRAINT IF EXISTS expenses_tax_recoverability_valid,
  DROP CONSTRAINT IF EXISTS expenses_tax_code_valid;

ALTER TABLE greenhouse_finance.expenses
  DROP COLUMN IF EXISTS effective_cost_amount_clp,
  DROP COLUMN IF EXISTS effective_cost_amount,
  DROP COLUMN IF EXISTS non_recoverable_tax_amount_clp,
  DROP COLUMN IF EXISTS non_recoverable_tax_amount,
  DROP COLUMN IF EXISTS recoverable_tax_amount_clp,
  DROP COLUMN IF EXISTS recoverable_tax_amount,
  DROP COLUMN IF EXISTS tax_snapshot_frozen_at,
  DROP COLUMN IF EXISTS is_tax_exempt,
  DROP COLUMN IF EXISTS tax_snapshot_json,
  DROP COLUMN IF EXISTS tax_amount_snapshot,
  DROP COLUMN IF EXISTS tax_rate_snapshot,
  DROP COLUMN IF EXISTS tax_recoverability,
  DROP COLUMN IF EXISTS tax_code;
