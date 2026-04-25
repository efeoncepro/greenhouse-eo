/**
 * TASK-545 Fase A — Product Catalog Source Backfill (CLI)
 *
 * Reclassifies every row in `greenhouse_commercial.product_catalog` by
 * resolving `source_kind` + `source_id` from the 4 source catalogs via SKU
 * prefix heuristics. Same logic as migration M3 but re-runnable against a
 * refreshed staging snapshot.
 *
 * Usage:
 *   npx tsx scripts/backfill-product-catalog-source.ts           # apply
 *   npx tsx scripts/backfill-product-catalog-source.ts --dry-run # preview
 *   npx tsx scripts/backfill-product-catalog-source.ts --force   # reclassify
 *                                                                 # including already-classified rows
 *
 * Idempotent by default: only rows with `source_kind IS NULL` are touched.
 * With `--force`, every row is re-evaluated (useful for staging resets).
 *
 * Prefix → source_kind mapping:
 *   ECG-* → sellable_role  (sellable_roles.role_sku → role_id)
 *   ETG-* → tool           (tool_catalog.tool_sku → tool_id)
 *   EFO-* → overhead_addon (overhead_addons.addon_sku → addon_id)
 *   EFG-* → service        (service_pricing.service_sku → module_id)
 *   PRD-* → manual         (no source_id)
 *   other + hubspot_product_id → hubspot_imported
 *   other no hubspot_product_id → left NULL (logged)
 */

import {
  closeGreenhousePostgres,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '../src/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

type SourceKind =
  | 'sellable_role'
  | 'sellable_role_variant'
  | 'tool'
  | 'overhead_addon'
  | 'service'
  | 'manual'
  | 'hubspot_imported'

interface CandidateRow extends Record<string, unknown> {
  product_id: string
  product_code: string
  current_source_kind: SourceKind | null
  current_source_id: string | null
  hubspot_product_id: string | null
  resolved_source_kind: SourceKind | null
  resolved_source_id: string | null
}

const parseArgs = () => {
  const args = process.argv.slice(2)

  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force')
  }
}

const run = async () => {
  const { dryRun, force } = parseArgs()

  console.log(`[backfill-product-catalog] mode=${dryRun ? 'dry-run' : 'apply'} force=${force}`)

  // Single CTE snapshot: classify every product in one query. The resolved
  // values come from LEFT JOINs; unresolved rows keep NULL.
  const snapshot = await runGreenhousePostgresQuery<CandidateRow>(
    `WITH candidates AS (
       SELECT
         pc.product_id,
         pc.product_code,
         pc.source_kind::text AS current_source_kind,
         pc.source_id,
         pc.hubspot_product_id,
         CASE
           WHEN sr.role_id IS NOT NULL THEN 'sellable_role'
           WHEN tc.tool_id IS NOT NULL THEN 'tool'
           WHEN oa.addon_id IS NOT NULL THEN 'overhead_addon'
           WHEN sp.module_id IS NOT NULL THEN 'service'
           WHEN pc.product_code LIKE 'PRD-%' THEN 'manual'
           WHEN pc.hubspot_product_id IS NOT NULL THEN 'hubspot_imported'
           ELSE NULL
         END AS resolved_source_kind,
         COALESCE(sr.role_id, tc.tool_id, oa.addon_id, sp.module_id) AS resolved_source_id
       FROM greenhouse_commercial.product_catalog pc
       LEFT JOIN greenhouse_commercial.sellable_roles sr
         ON sr.role_sku = pc.product_code AND pc.product_code LIKE 'ECG-%'
       LEFT JOIN greenhouse_ai.tool_catalog tc
         ON tc.tool_sku = pc.product_code AND pc.product_code LIKE 'ETG-%'
       LEFT JOIN greenhouse_commercial.overhead_addons oa
         ON oa.addon_sku = pc.product_code AND pc.product_code LIKE 'EFO-%'
       LEFT JOIN greenhouse_commercial.service_pricing sp
         ON sp.service_sku = pc.product_code AND pc.product_code LIKE 'EFG-%'
     )
     SELECT *
     FROM candidates
     ORDER BY product_code`
  )

  const candidates = snapshot.filter(row => {
    if (force) return true

    return row.current_source_kind === null
  })

  const resolvable = candidates.filter(row => row.resolved_source_kind !== null)
  const ambiguous = candidates.filter(row => row.resolved_source_kind === null)

  const distribution = new Map<SourceKind, number>()

  for (const row of resolvable) {
    const kind = row.resolved_source_kind as SourceKind

    distribution.set(kind, (distribution.get(kind) ?? 0) + 1)
  }

  console.log(`[backfill-product-catalog] total rows inspected: ${snapshot.length}`)
  console.log(`[backfill-product-catalog] candidates to (re)classify: ${candidates.length}`)
  console.log(`[backfill-product-catalog] resolvable: ${resolvable.length}`)

  for (const [kind, count] of distribution) {
    console.log(`  → ${kind}: ${count}`)
  }

  if (ambiguous.length > 0) {
    console.warn(
      `[backfill-product-catalog] ${ambiguous.length} ambiguous rows (no prefix match, no HubSpot anchor). Sample:`
    )

    for (const row of ambiguous.slice(0, 10)) {
      console.warn(`  - ${row.product_id} (${row.product_code})`)
    }

    if (ambiguous.length > 10) {
      console.warn(`  …and ${ambiguous.length - 10} more`)
    }
  }

  if (dryRun) {
    console.log('[backfill-product-catalog] dry-run — no writes.')

    return
  }

  if (resolvable.length === 0) {
    console.log('[backfill-product-catalog] nothing to write.')

    return
  }

  await withGreenhousePostgresTransaction(async txClient => {
    for (const row of resolvable) {
      await txClient.query(
        `UPDATE greenhouse_commercial.product_catalog
            SET source_kind = $2,
                source_id = $3,
                updated_at = NOW()
          WHERE product_id = $1
            AND (source_kind IS NULL OR $4::boolean)`,
        [row.product_id, row.resolved_source_kind, row.resolved_source_id, force]
      )
    }
  })

  console.log(`[backfill-product-catalog] wrote ${resolvable.length} rows.`)

  if (ambiguous.length > 0) {
    console.log(
      `[backfill-product-catalog] ${ambiguous.length} rows still ambiguous — operator action needed.`
    )
    process.exitCode = 2
  }
}

run()
  .catch(error => {
    console.error('[backfill-product-catalog] failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
