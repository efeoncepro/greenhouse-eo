/**
 * TASK-605 (Slice 5) — Backfill HubSpot products with the v2 outbound shape.
 *
 * TASK-603 (outbound v2) and TASK-604 (inbound v2) are live in production.
 * The 74 existing HubSpot products still carry the v1 shape — they were never
 * pushed with the 16 v2 fields (pricesByCurrency, descriptionRichHtml,
 * productType, categoryCode, unitCode, taxCategoryCode, isRecurring,
 * recurringBillingFrequency, commercialOwnerEmail, hubspotOwnerId,
 * marketingUrl, imageUrls, pricingModel, productClassification, bundleType,
 * costOfGoodsSold).
 *
 * This script iterates `greenhouse_commercial.product_catalog` and invokes
 * `pushProductToHubSpot` per row so the outbound v2 adapter re-hydrates each
 * HS product with the full v2 payload.
 *
 * Idempotent by design:
 *   - `pushProductToHubSpot` already has anti-ping-pong via `hubspot_last_write_at`.
 *   - Re-running `--apply` N times produces the same end state (no duplicate
 *     writes thanks to the guard + idempotent PATCH semantics).
 *
 * Graceful errors: a single product failure does NOT stop the loop. All
 * outcomes (including exceptions) are captured in the markdown report.
 *
 * Usage:
 *   # Dry-run (default) — fetches catalog, logs what WOULD be synced, no HS writes
 *   pnpm tsx scripts/backfill/product-catalog-hs-v2.ts
 *
 *   # Apply — real writes to HubSpot via the outbound v2 bridge
 *   pnpm tsx scripts/backfill/product-catalog-hs-v2.ts --apply
 *
 * Output:
 *   docs/operations/backfill-product-catalog-hs-v2-YYYYMMDD.md
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import {
  listCommercialProductCatalog,
  type CommercialProductCatalogEntry
} from '@/lib/commercial/product-catalog-store'
import { pushProductToHubSpot } from '@/lib/hubspot/push-product-to-hubspot'
import type { ProductHubSpotPushResult } from '@/lib/hubspot/product-hubspot-types'

// ── Types ────────────────────────────────────────────────────

type BackfillAction = 'created' | 'updated' | 'skipped' | 'failed' | 'dry_run'

interface BackfillOutcome {
  productId: string
  productCode: string
  productName: string
  action: BackfillAction
  hubspotProductId: string | null
  status: string | null
  reason: string | null
  errorMessage: string | null
}

interface BackfillSummary {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  dryRun: number
}

// ── Helpers ──────────────────────────────────────────────────

const deriveActionFromResult = (result: ProductHubSpotPushResult): BackfillAction => {
  if (result.action === 'created') return 'created'
  if (result.action === 'updated' || result.action === 'unarchived') return 'updated'
  if (result.action === 'archived') return 'skipped'
  if (result.action === 'noop') return 'skipped'

  return 'skipped'
}

const fetchAllCatalogEntries = async (): Promise<CommercialProductCatalogEntry[]> => {
  const pageSize = 500
  const all: CommercialProductCatalogEntry[] = []
  let offset = 0

  // Paginate defensively even though 74 products fit in one page. Keeps the
  // script correct if the catalog grows between runs.
   
  while (true) {
    const page = await listCommercialProductCatalog({
      includeArchived: true,
      limit: pageSize,
      offset
    })

    all.push(...page.items)

    if (page.items.length < pageSize) break
    if (all.length >= page.total) break

    offset += pageSize
  }

  return all
}

const processOne = async (
  entry: CommercialProductCatalogEntry,
  apply: boolean
): Promise<BackfillOutcome> => {
  if (!apply) {
    const wouldAction: BackfillAction = entry.hubspotProductId ? 'updated' : 'created'

    return {
      productId: entry.productId,
      productCode: entry.productCode,
      productName: entry.productName,
      action: 'dry_run',
      hubspotProductId: entry.hubspotProductId,
      status: null,
      reason: `would ${wouldAction} on --apply`,
      errorMessage: null
    }
  }

  try {
    const result = await pushProductToHubSpot({
      productId: entry.productId,
      eventType: 'commercial.product_catalog.updated',
      actorId: 'task-605-backfill'
    })

    return {
      productId: entry.productId,
      productCode: entry.productCode,
      productName: entry.productName,
      action: deriveActionFromResult(result),
      hubspotProductId: result.hubspotProductId,
      status: result.status,
      reason: result.reason ?? null,
      errorMessage: null
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    return {
      productId: entry.productId,
      productCode: entry.productCode,
      productName: entry.productName,
      action: 'failed',
      hubspotProductId: entry.hubspotProductId,
      status: 'failed',
      reason: null,
      errorMessage
    }
  }
}

const buildSummary = (outcomes: BackfillOutcome[]): BackfillSummary => {
  const summary: BackfillSummary = {
    total: outcomes.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    dryRun: 0
  }

  for (const outcome of outcomes) {
    if (outcome.action === 'created') summary.created++
    else if (outcome.action === 'updated') summary.updated++
    else if (outcome.action === 'skipped') summary.skipped++
    else if (outcome.action === 'failed') summary.failed++
    else if (outcome.action === 'dry_run') summary.dryRun++
  }

  return summary
}

// ── Markdown rendering ───────────────────────────────────────

const renderReport = (outcomes: BackfillOutcome[], summary: BackfillSummary, apply: boolean): string => {
  const lines: string[] = []
  const dateStamp = new Date().toISOString().slice(0, 10)

  lines.push(`# Backfill Product Catalog → HubSpot v2 — ${dateStamp}`)
  lines.push('')
  lines.push(`> **Tipo de documento:** Reporte operativo (TASK-605 Slice 5 — Backfill v2)`)
  lines.push(`> **Modo:** ${apply ? '**APPLY** (escrituras reales a HubSpot via outbound v2)' : 'Dry-run (sin escrituras)'}`)
  lines.push(`> **Script:** \`scripts/backfill/product-catalog-hs-v2.ts\``)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Resumen')
  lines.push('')
  lines.push(`- Total productos procesados: **${summary.total}**`)

  if (apply) {
    lines.push(`- Created: **${summary.created}**`)
    lines.push(`- Updated: **${summary.updated}**`)
    lines.push(`- Skipped (noop / anti-ping-pong / archived): **${summary.skipped}**`)
    lines.push(`- Failed: **${summary.failed}**`)
  } else {
    lines.push(`- Dry-run (would sync on \`--apply\`): **${summary.dryRun}**`)
  }

  lines.push('')
  lines.push('## Detalle')
  lines.push('')

  if (outcomes.length === 0) {
    lines.push('_No hay productos en `greenhouse_commercial.product_catalog`._')
    lines.push('')

    return lines.join('\n')
  }

  lines.push('| Product Code | Product Name | Action | HubSpot Product ID | Notes |')
  lines.push('|---|---|---|---|---|')

  for (const outcome of outcomes) {
    const notes =
      outcome.errorMessage ??
      outcome.reason ??
      (outcome.status ? `status=${outcome.status}` : '—')

    const hsId = outcome.hubspotProductId ?? '—'

    lines.push(
      `| \`${outcome.productCode}\` | ${outcome.productName} | ${outcome.action} | ${hsId} | ${notes.replace(/\|/g, '\\|')} |`
    )
  }

  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Decisiones')
  lines.push('')
  lines.push('- **Idempotente**: re-correr `--apply` produce el mismo estado final. Anti-ping-pong (`hubspot_last_write_at < 60s`) + PATCH idempotente en HubSpot garantizan que no hay doble-escritura.')
  lines.push('- **Errores no bloqueantes**: una falla por producto no detiene el loop — se captura en la columna `Notes`.')
  lines.push('- **Event type fijo**: todas las llamadas usan `commercial.product_catalog.updated` para que el adapter derive `created` vs `updated` a partir del estado actual del row.')
  lines.push(`- **Actor ID**: \`task-605-backfill\` (trazable en el catálogo de eventos de outbox).`)
  lines.push('')

  return lines.join('\n')
}

// ── Main ─────────────────────────────────────────────────────

const main = async () => {
  const apply = process.argv.includes('--apply')

   
  console.log(`[backfill] Mode: ${apply ? 'APPLY' : 'dry-run'}`)
   
  console.log('[backfill] Loading product catalog...')

  let entries: CommercialProductCatalogEntry[]

  try {
    entries = await fetchAllCatalogEntries()
  } catch (err) {
     
    console.error('[backfill] Failed to load catalog:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

   
  console.log(`[backfill] Retrieved ${entries.length} products. Processing...`)

  const outcomes: BackfillOutcome[] = []

  for (const entry of entries) {
    const outcome = await processOne(entry, apply)

    outcomes.push(outcome)

    const hsId = outcome.hubspotProductId ?? '(none)'

    const suffix = outcome.errorMessage
      ? ` — error: ${outcome.errorMessage}`
      : outcome.reason
        ? ` — ${outcome.reason}`
        : ''

     
    console.log(
      `[backfill] ${outcome.productCode} → ${outcome.action} (hs=${hsId})${suffix}`
    )
  }

  const summary = buildSummary(outcomes)
  const markdown = renderReport(outcomes, summary, apply)
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  const outputPath = resolve(
    process.cwd(),
    `docs/operations/backfill-product-catalog-hs-v2-${dateStamp}.md`
  )

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, markdown, 'utf-8')

   
  console.log(`[backfill] Report written: ${outputPath}`)

  if (apply) {
     
    console.log(
      `[backfill] Summary: total=${summary.total} created=${summary.created} updated=${summary.updated} skipped=${summary.skipped} failed=${summary.failed}`
    )
  } else {
     
    console.log(`[backfill] Summary (dry-run): total=${summary.total} would-sync=${summary.dryRun}`)
  }
}

main().catch(err => {
   
  console.error('[backfill] Fatal:', err)
  process.exit(1)
})
