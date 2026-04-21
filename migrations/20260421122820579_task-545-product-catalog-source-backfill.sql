-- Up Migration
-- TASK-545 Fase A: idempotent source backfill for `product_catalog`. Resolves
-- `source_kind` + `source_id` for existing rows via SKU-prefix heuristics,
-- joining against the 4 source catalogs. Rows already classified are skipped.
--
-- Prefix policy (anchored to the product_code conventions used by each
-- source table's SKU sequence):
--   ECG-* → sellable_role     (greenhouse_commercial.sellable_roles.role_sku)
--   ETG-* → tool              (greenhouse_ai.tool_catalog.tool_sku)
--   EFO-* → overhead_addon    (greenhouse_commercial.overhead_addons.addon_sku)
--   EFG-* → service           (greenhouse_commercial.service_pricing.service_sku)
--   PRD-* → manual            (no source_id; locally authored)
--   other + hubspot_product_id → hubspot_imported (orphan adoption)
--   other no hubspot_product_id → leave NULL, log via raised NOTICE
--
-- A follow-up CLI (`scripts/backfill-product-catalog-source.ts`) supports
-- `--dry-run` and `--force` for operational re-runs post-deploy.

SET search_path = greenhouse_commercial, greenhouse_ai, public;

-- ── 1. Sellable roles (ECG-…) ──────────────────────────────────────────────
WITH matched AS (
  SELECT pc.product_id, sr.role_id
  FROM greenhouse_commercial.product_catalog pc
  INNER JOIN greenhouse_commercial.sellable_roles sr
    ON sr.role_sku = pc.product_code
  WHERE pc.source_kind IS NULL
    AND pc.product_code LIKE 'ECG-%'
)
UPDATE greenhouse_commercial.product_catalog pc
SET source_kind = 'sellable_role',
    source_id = matched.role_id,
    updated_at = NOW()
FROM matched
WHERE pc.product_id = matched.product_id;

-- ── 2. Tools (ETG-…) ───────────────────────────────────────────────────────
WITH matched AS (
  SELECT pc.product_id, tc.tool_id
  FROM greenhouse_commercial.product_catalog pc
  INNER JOIN greenhouse_ai.tool_catalog tc
    ON tc.tool_sku = pc.product_code
  WHERE pc.source_kind IS NULL
    AND pc.product_code LIKE 'ETG-%'
)
UPDATE greenhouse_commercial.product_catalog pc
SET source_kind = 'tool',
    source_id = matched.tool_id,
    updated_at = NOW()
FROM matched
WHERE pc.product_id = matched.product_id;

-- ── 3. Overhead addons (EFO-…) ─────────────────────────────────────────────
WITH matched AS (
  SELECT pc.product_id, oa.addon_id
  FROM greenhouse_commercial.product_catalog pc
  INNER JOIN greenhouse_commercial.overhead_addons oa
    ON oa.addon_sku = pc.product_code
  WHERE pc.source_kind IS NULL
    AND pc.product_code LIKE 'EFO-%'
)
UPDATE greenhouse_commercial.product_catalog pc
SET source_kind = 'overhead_addon',
    source_id = matched.addon_id,
    updated_at = NOW()
FROM matched
WHERE pc.product_id = matched.product_id;

-- ── 4. Services (EFG-…) ────────────────────────────────────────────────────
-- service_pricing PK is `module_id`; `service_sku` is the SKU column.
WITH matched AS (
  SELECT pc.product_id, sp.module_id
  FROM greenhouse_commercial.product_catalog pc
  INNER JOIN greenhouse_commercial.service_pricing sp
    ON sp.service_sku = pc.product_code
  WHERE pc.source_kind IS NULL
    AND pc.product_code LIKE 'EFG-%'
)
UPDATE greenhouse_commercial.product_catalog pc
SET source_kind = 'service',
    source_id = matched.module_id,
    updated_at = NOW()
FROM matched
WHERE pc.product_id = matched.product_id;

-- ── 5. Manual (PRD-… without source catalog match) ────────────────────────
-- Locally authored products, no Greenhouse-side source row.
UPDATE greenhouse_commercial.product_catalog
SET source_kind = 'manual',
    source_id = NULL,
    updated_at = NOW()
WHERE source_kind IS NULL
  AND product_code LIKE 'PRD-%';

-- ── 6. HubSpot imported orphans ────────────────────────────────────────────
-- Anything still NULL but that has a HubSpot anchor is classified as
-- hubspot_imported. These represent products that came in from HubSpot
-- without a matching Greenhouse source — TASK-548 drift cron will flag them
-- as `orphan_in_greenhouse` candidates for adoption.
UPDATE greenhouse_commercial.product_catalog
SET source_kind = 'hubspot_imported',
    source_id = NULL,
    updated_at = NOW()
WHERE source_kind IS NULL
  AND hubspot_product_id IS NOT NULL;

-- ── Sanity check + ambiguity report ────────────────────────────────────────
-- Anything still NULL after the six passes is an ambiguous legacy row. We
-- refuse to guess and surface the count for ops. This should be a small
-- number (legacy manual rows without PRD- prefix, etc.); the follow-up CLI
-- re-runs the same logic and can apply `--force` to reclassify after operator
-- review.
DO $$
DECLARE
  ambiguous_count integer;
  total_count integer;
  ambiguous_sample text;
BEGIN
  SELECT COUNT(*) INTO total_count FROM greenhouse_commercial.product_catalog;

  SELECT COUNT(*) INTO ambiguous_count
    FROM greenhouse_commercial.product_catalog
    WHERE source_kind IS NULL;

  IF ambiguous_count > 0 THEN
    SELECT string_agg(product_id || ' (' || product_code || ')', ', ' ORDER BY product_code)
      INTO ambiguous_sample
      FROM (
        SELECT product_id, product_code
        FROM greenhouse_commercial.product_catalog
        WHERE source_kind IS NULL
        ORDER BY product_code
        LIMIT 20
      ) sample;

    RAISE NOTICE
      'TASK-545 backfill: % of % product_catalog rows remain with source_kind=NULL (sample: %). Re-run scripts/backfill-product-catalog-source.ts --force after operator review.',
      ambiguous_count, total_count, ambiguous_sample;
  ELSE
    RAISE NOTICE 'TASK-545 backfill: all % product_catalog rows classified.', total_count;
  END IF;
END $$;

-- Down Migration
-- Intentional no-op: we only populated a new nullable column. Reverting the
-- backfill would destroy the source linkage for rows that have nothing else
-- identifying them. The DDL migration (M1) rollback drops the column wholesale.

SET search_path = greenhouse_commercial, public;
