-- Up Migration
-- TASK-530: explicit IVA snapshots on quotations + line items. Builds on
-- TASK-529 tax foundation (`greenhouse_finance.tax_codes`). The legacy
-- `tax_rate`/`tax_amount` columns stay for backwards compat; new columns
-- persist an immutable `ChileTaxSnapshot` per version so PDFs, emails and
-- quote-to-cash inherit a stable tax contract.

SET search_path = greenhouse_commercial, public;

-- ── Quotation header ──────────────────────────────────────────────────────

ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS tax_code text,
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot numeric(6, 4),
  ADD COLUMN IF NOT EXISTS tax_amount_snapshot numeric(18, 2),
  ADD COLUMN IF NOT EXISTS tax_snapshot_json jsonb,
  ADD COLUMN IF NOT EXISTS is_tax_exempt boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tax_snapshot_frozen_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotations_tax_code_valid'
  ) THEN
    ALTER TABLE greenhouse_commercial.quotations
      ADD CONSTRAINT quotations_tax_code_valid
      CHECK (
        tax_code IS NULL OR tax_code IN (
          'cl_vat_19',
          'cl_vat_exempt',
          'cl_vat_non_billable'
        )
      );
  END IF;
END $$;

-- When the snapshot is present the raw JSON must be present too (and vice
-- versa). Keeps the contract clean for downstream consumers.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotations_tax_snapshot_consistent'
  ) THEN
    ALTER TABLE greenhouse_commercial.quotations
      ADD CONSTRAINT quotations_tax_snapshot_consistent
      CHECK (
        (tax_code IS NULL AND tax_snapshot_json IS NULL AND tax_snapshot_frozen_at IS NULL)
        OR (tax_code IS NOT NULL AND tax_snapshot_json IS NOT NULL AND tax_snapshot_frozen_at IS NOT NULL)
      );
  END IF;
END $$;

-- Hot-path: reports filter by tax_code (e.g. "all exempt quotes this month").
CREATE INDEX IF NOT EXISTS idx_quotations_tax_code
  ON greenhouse_commercial.quotations (tax_code)
  WHERE tax_code IS NOT NULL;

COMMENT ON COLUMN greenhouse_commercial.quotations.tax_code IS
  'Canonical Chile tax code applied to the quote (cl_vat_19 / cl_vat_exempt / cl_vat_non_billable). See GREENHOUSE_FINANCE_ARCHITECTURE_V1 Delta 2026-04-21 (Chile tax foundation).';

COMMENT ON COLUMN greenhouse_commercial.quotations.tax_snapshot_json IS
  'Frozen ChileTaxSnapshot (version=1) with the rate, label, recoverability and amounts captured at issuance. Immutable — never recalculated retroactively.';

COMMENT ON COLUMN greenhouse_commercial.quotations.is_tax_exempt IS
  'Derived flag for fast filtering — true when tax_code IN (cl_vat_exempt, cl_vat_non_billable).';

-- ── Line items (future-proof per-line overrides) ───────────────────────────

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD COLUMN IF NOT EXISTS tax_code text,
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot numeric(6, 4),
  ADD COLUMN IF NOT EXISTS tax_amount_snapshot numeric(18, 2),
  ADD COLUMN IF NOT EXISTS tax_snapshot_json jsonb,
  ADD COLUMN IF NOT EXISTS is_tax_exempt boolean NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotation_line_items_tax_code_valid'
  ) THEN
    ALTER TABLE greenhouse_commercial.quotation_line_items
      ADD CONSTRAINT quotation_line_items_tax_code_valid
      CHECK (
        tax_code IS NULL OR tax_code IN (
          'cl_vat_19',
          'cl_vat_exempt',
          'cl_vat_non_billable'
        )
      );
  END IF;
END $$;

-- ── Backfill existing rows ─────────────────────────────────────────────────
-- Heuristics:
--   tax_rate ≈ 0.19 → cl_vat_19
--   tax_rate = 0 or IS NULL with legacy_tax_amount = 0 → cl_vat_exempt
--   tax_rate IS NULL and no tax info → cl_vat_non_billable
-- Each classified row gets a synthetic snapshot that preserves the legacy
-- tax_amount so totals stay stable.

WITH classified AS (
  SELECT
    q.quotation_id,
    q.tax_rate,
    q.tax_amount,
    q.subtotal,
    q.total_amount,
    q.currency,
    CASE
      WHEN q.tax_rate IS NOT NULL AND ABS(q.tax_rate - 0.19) < 0.0001 THEN 'cl_vat_19'
      WHEN q.tax_rate = 0 THEN 'cl_vat_exempt'
      WHEN q.tax_rate IS NULL THEN 'cl_vat_non_billable'
      ELSE 'cl_vat_19'
    END AS resolved_code
  FROM greenhouse_commercial.quotations q
  WHERE q.tax_code IS NULL
)
UPDATE greenhouse_commercial.quotations q
SET
  tax_code = c.resolved_code,
  tax_rate_snapshot = CASE
    WHEN c.resolved_code = 'cl_vat_19' THEN 0.1900
    ELSE NULL
  END,
  tax_amount_snapshot = COALESCE(c.tax_amount, 0),
  tax_snapshot_frozen_at = COALESCE(q.updated_at, q.created_at, NOW()),
  is_tax_exempt = c.resolved_code IN ('cl_vat_exempt', 'cl_vat_non_billable'),
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
    'frozenAt', COALESCE(q.updated_at, q.created_at, NOW())::text,
    'taxableAmount', COALESCE(c.subtotal, 0),
    'taxAmount', COALESCE(c.tax_amount, 0),
    'totalAmount', COALESCE(c.total_amount, c.subtotal, 0),
    'metadata', jsonb_build_object('backfillSource', 'TASK-530')
  )
FROM classified c
WHERE q.quotation_id = c.quotation_id;

-- Backfill line items by inheriting the header tax_code. Synthetic snapshot
-- proportional to legacy_tax_amount so consumers see coherent totals.
UPDATE greenhouse_commercial.quotation_line_items li
SET
  tax_code = q.tax_code,
  tax_rate_snapshot = q.tax_rate_snapshot,
  tax_amount_snapshot = COALESCE(li.legacy_tax_amount, 0),
  is_tax_exempt = q.is_tax_exempt,
  tax_snapshot_json = jsonb_build_object(
    'version', '1',
    'taxCode', q.tax_code,
    'jurisdiction', 'CL',
    'kind', q.tax_snapshot_json ->> 'kind',
    'rate', (q.tax_snapshot_json -> 'rate'),
    'recoverability', 'not_applicable',
    'labelEs', q.tax_snapshot_json ->> 'labelEs',
    'effectiveFrom', q.tax_snapshot_json ->> 'effectiveFrom',
    'frozenAt', q.tax_snapshot_json ->> 'frozenAt',
    'taxableAmount', COALESCE(li.subtotal_price, 0),
    'taxAmount', COALESCE(li.legacy_tax_amount, 0),
    'totalAmount', COALESCE(li.subtotal_price, 0) + COALESCE(li.legacy_tax_amount, 0),
    'metadata', jsonb_build_object('backfillSource', 'TASK-530', 'inheritedFromHeader', true)
  )
FROM greenhouse_commercial.quotations q
WHERE li.quotation_id = q.quotation_id
  AND li.tax_code IS NULL
  AND q.tax_code IS NOT NULL;

-- Down Migration

SET search_path = greenhouse_commercial, public;

DROP INDEX IF EXISTS greenhouse_commercial.idx_quotations_tax_code;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP CONSTRAINT IF EXISTS quotation_line_items_tax_code_valid;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP COLUMN IF EXISTS is_tax_exempt,
  DROP COLUMN IF EXISTS tax_snapshot_json,
  DROP COLUMN IF EXISTS tax_amount_snapshot,
  DROP COLUMN IF EXISTS tax_rate_snapshot,
  DROP COLUMN IF EXISTS tax_code;

ALTER TABLE greenhouse_commercial.quotations
  DROP CONSTRAINT IF EXISTS quotations_tax_snapshot_consistent,
  DROP CONSTRAINT IF EXISTS quotations_tax_code_valid;

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS tax_snapshot_frozen_at,
  DROP COLUMN IF EXISTS is_tax_exempt,
  DROP COLUMN IF EXISTS tax_snapshot_json,
  DROP COLUMN IF EXISTS tax_amount_snapshot,
  DROP COLUMN IF EXISTS tax_rate_snapshot,
  DROP COLUMN IF EXISTS tax_code;
