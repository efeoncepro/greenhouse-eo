/**
 * TASK-602 Fase B (Slice 4) — Discovery: HubSpot prices seed.
 *
 * Barre los productos del portal HubSpot, busca cualquier `hs_price_{clp|usd|clf|cop|mxn|pen}`
 * poblado y lo inserta como fila autoritativa `source='hs_seed'` en
 * `greenhouse_commercial.product_catalog_prices` si el producto ya existe en el
 * catálogo interno (matched via `hubspot_product_id`).
 *
 * Idempotente por diseño:
 * - Si la fila `(product_id, currency_code)` ya es autoritativa (ej. por backfill
 *   del Slice 3 o por un seed previo), NO se sobrescribe — el log la reporta
 *   como `conflict`.
 * - Si la fila existe como derivada FX, se promueve a autoritativa con
 *   `source='hs_seed'`.
 *
 * Discovery ONE-TIME. Después de correrlo, GH es SoT permanente y
 * el outbound v2 (TASK-603) sobrescribe HS en cada push.
 *
 * Uso:
 *   # Dry-run (default): reporta qué se haría sin escribir nada
 *   pnpm tsx scripts/discovery/hubspot-products-prices-seed.ts
 *
 *   # Apply: ejecuta el seed de verdad (requiere acceso DB)
 *   pnpm tsx scripts/discovery/hubspot-products-prices-seed.ts --apply
 *
 * Output:
 *   docs/operations/discovery-hubspot-products-prices-seed-YYYYMMDD.md
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import {
  CURRENCY_CODES,
  getAllPrices,
  setAuthoritativePrice,
  type CurrencyCode
} from '@/lib/commercial/product-catalog-prices'
import { query } from '@/lib/db'
import {
  getHubSpotGreenhouseProductCatalog,
  type HubSpotGreenhouseProductProfile
} from '@/lib/integrations/hubspot-greenhouse-service'

// ── Tipos ────────────────────────────────────────────────────

interface MatchedProduct {
  productId: string
  hubspotProductId: string
  productName: string | null
  hsPrices: Partial<Record<CurrencyCode, number>>
}

type SeedOutcome =
  | { outcome: 'seeded'; productId: string; currencyCode: CurrencyCode; unitPrice: number }
  | {
      outcome: 'conflict'
      productId: string
      currencyCode: CurrencyCode
      existingSource: string
      hsPrice: number
    }
  | { outcome: 'skipped_dry_run'; productId: string; currencyCode: CurrencyCode; unitPrice: number }

interface ReportAggregation {
  totalHubSpotProducts: number
  matchedProducts: number
  unmatchedProducts: number
  productsWithAnyHsPrice: number
  outcomes: SeedOutcome[]
  byCurrency: Record<CurrencyCode, { seeded: number; conflicts: number; dryRun: number }>
}

// ── Helpers ──────────────────────────────────────────────────

const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value)

const parseHsPrice = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Extrae los 6 precios por moneda del payload raw del producto HS.
 * El middleware v1 puede o no exponer estos fields; el script es tolerante.
 * Cuando TASK-603 upgradee el contract a v2, este helper leerá del campo
 * estructurado `pricesByCurrency` directamente.
 */
const extractHsPrices = (product: HubSpotGreenhouseProductProfile): Partial<Record<CurrencyCode, number>> => {
  const raw = product as unknown as Record<string, unknown>
  const result: Partial<Record<CurrencyCode, number>> = {}

  // Shape v2 (esperado post TASK-603): product.pricesByCurrency = { CLP: 1000, USD: 1, ... }
  const structured = raw.pricesByCurrency

  if (structured && typeof structured === 'object') {
    for (const [key, value] of Object.entries(structured as Record<string, unknown>)) {
      const code = key.toUpperCase()

      if (isCurrencyCode(code)) {
        const parsed = parseHsPrice(value)

        if (parsed !== null) result[code] = parsed
      }
    }

    if (Object.keys(result).length > 0) return result
  }

  // Shape v1: hs_price_clp, hs_price_usd, etc. como properties planas
  for (const code of CURRENCY_CODES) {
    const parsed = parseHsPrice(raw[`hs_price_${code.toLowerCase()}`])

    if (parsed !== null) result[code] = parsed
  }

  return result
}

// ── Matching con catálogo local ──────────────────────────────

interface CatalogRow extends Record<string, unknown> {
  product_id: string
  hubspot_product_id: string
  product_name: string | null
}

const fetchLocalCatalogByHubSpotId = async (): Promise<Map<string, CatalogRow>> => {
  const rows = await query<CatalogRow>(
    `SELECT product_id, hubspot_product_id, product_name
       FROM greenhouse_commercial.product_catalog
      WHERE hubspot_product_id IS NOT NULL`
  )

  const map = new Map<string, CatalogRow>()

  for (const row of rows) {
    map.set(row.hubspot_product_id, row)
  }

  return map
}

// ── Seed ────────────────────────────────────────────────────

const seedProductPrice = async (
  match: MatchedProduct,
  currencyCode: CurrencyCode,
  unitPrice: number,
  apply: boolean
): Promise<SeedOutcome> => {
  // Check existente antes de escribir (idempotencia + detección de conflicto).
  const existing = await getAllPrices(match.productId)
  const currentRow = existing.find(p => p.currencyCode === currencyCode)

  if (currentRow?.isAuthoritative) {
    return {
      outcome: 'conflict',
      productId: match.productId,
      currencyCode,
      existingSource: currentRow.source,
      hsPrice: unitPrice
    }
  }

  if (!apply) {
    return {
      outcome: 'skipped_dry_run',
      productId: match.productId,
      currencyCode,
      unitPrice
    }
  }

  await setAuthoritativePrice({
    productId: match.productId,
    currencyCode,
    unitPrice,
    source: 'hs_seed'
  })

  return {
    outcome: 'seeded',
    productId: match.productId,
    currencyCode,
    unitPrice
  }
}

// ── Markdown rendering ───────────────────────────────────────

const renderReport = (report: ReportAggregation, apply: boolean): string => {
  const lines: string[] = []
  const dateStamp = new Date().toISOString().slice(0, 10)

  lines.push(`# HubSpot Products Prices Seed — ${dateStamp}`)
  lines.push('')
  lines.push(`> **Tipo de documento:** Reporte operativo (TASK-602 Fase B Slice 4 — Discovery)`)
  lines.push(`> **Modo:** ${apply ? '**APPLY** (escrituras reales en Postgres)' : 'Dry-run (no se escribió nada)'}`)
  lines.push(`> **Script:** \`scripts/discovery/hubspot-products-prices-seed.ts\``)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Resumen')
  lines.push('')
  lines.push(`- Total productos HubSpot escaneados: **${report.totalHubSpotProducts}**`)
  lines.push(`- Productos matcheados con \`greenhouse_commercial.product_catalog\` (via \`hubspot_product_id\`): **${report.matchedProducts}**`)
  lines.push(`- Productos HS sin counterpart local (no-op): **${report.unmatchedProducts}**`)
  lines.push(`- Productos con al menos un \`hs_price_*\` poblado: **${report.productsWithAnyHsPrice}**`)
  lines.push('')
  lines.push('## Por moneda')
  lines.push('')
  lines.push('| Currency | Seeded | Dry-run (pending) | Conflicts (auth already exists) |')
  lines.push('|---|---|---|---|')

  for (const code of CURRENCY_CODES) {
    const row = report.byCurrency[code]

    lines.push(`| ${code} | ${row.seeded} | ${row.dryRun} | ${row.conflicts} |`)
  }

  lines.push('')

  if (report.outcomes.length > 0) {
    lines.push('## Detalle')
    lines.push('')
    lines.push('| Product | Currency | Outcome | Price | Notes |')
    lines.push('|---|---|---|---|---|')

    for (const outcome of report.outcomes) {
      if (outcome.outcome === 'conflict') {
        lines.push(
          `| \`${outcome.productId}\` | ${outcome.currencyCode} | conflict | ${outcome.hsPrice} | preserved existing \`source=${outcome.existingSource}\` |`
        )
      } else if (outcome.outcome === 'seeded') {
        lines.push(`| \`${outcome.productId}\` | ${outcome.currencyCode} | seeded | ${outcome.unitPrice} | — |`)
      } else {
        lines.push(
          `| \`${outcome.productId}\` | ${outcome.currencyCode} | dry-run | ${outcome.unitPrice} | would seed on \`--apply\` |`
        )
      }
    }
  } else {
    lines.push('## Detalle')
    lines.push('')
    lines.push('_No se encontraron `hs_price_*` poblados en el portal HS._')
    lines.push('')
    lines.push('Esto es consistente con el Discovery de TASK-601 (el outbound v1 nunca envió precios por moneda — todos los productos llegan a Fase B en green-field).')
  }

  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Decisiones')
  lines.push('')
  lines.push('- **Idempotente**: correr el script N veces produce el mismo estado. Filas autoritativas existentes (backfill del Slice 3 o seeds previos) NO se sobrescriben.')
  lines.push('- **GH SoT post-seed**: después de esta corrida, HubSpot pierde autoridad sobre precios. El outbound v2 (TASK-603) sobrescribe HS en cada push.')
  lines.push('- **Conflict behavior**: el operator puede resolver conflictos manualmente via admin UI (TASK-605) — el seed nunca destruye decisiones locales.')
  lines.push('')

  return lines.join('\n')
}

// ── Main ─────────────────────────────────────────────────────

const main = async () => {
  const apply = process.argv.includes('--apply')

  // eslint-disable-next-line no-console
  console.log(`[seed] Mode: ${apply ? 'APPLY' : 'dry-run'}`)
  // eslint-disable-next-line no-console
  console.log('[seed] Fetching HubSpot products via middleware...')

  let products: HubSpotGreenhouseProductProfile[]

  try {
    const response = await getHubSpotGreenhouseProductCatalog()

    products = response.products
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[seed] HubSpot fetch failed:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] Retrieved ${products.length} products. Loading local catalog...`)

  const catalog = await fetchLocalCatalogByHubSpotId()

  const report: ReportAggregation = {
    totalHubSpotProducts: products.length,
    matchedProducts: 0,
    unmatchedProducts: 0,
    productsWithAnyHsPrice: 0,
    outcomes: [],
    byCurrency: Object.fromEntries(
      CURRENCY_CODES.map(code => [code, { seeded: 0, conflicts: 0, dryRun: 0 }])
    ) as ReportAggregation['byCurrency']
  }

  for (const product of products) {
    const hubspotProductId = product.identity.hubspotProductId
    const local = catalog.get(hubspotProductId)

    if (!local) {
      report.unmatchedProducts++
      continue
    }

    report.matchedProducts++

    const hsPrices = extractHsPrices(product)
    const currenciesPopulated = Object.keys(hsPrices) as CurrencyCode[]

    if (currenciesPopulated.length === 0) continue

    report.productsWithAnyHsPrice++

    const match: MatchedProduct = {
      productId: local.product_id,
      hubspotProductId,
      productName: local.product_name,
      hsPrices
    }

    for (const code of currenciesPopulated) {
      const unitPrice = hsPrices[code]

      if (unitPrice === undefined) continue

      try {
        const outcome = await seedProductPrice(match, code, unitPrice, apply)

        report.outcomes.push(outcome)

        if (outcome.outcome === 'seeded') report.byCurrency[code].seeded++
        else if (outcome.outcome === 'conflict') report.byCurrency[code].conflicts++
        else report.byCurrency[code].dryRun++
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `[seed] Failed to seed ${match.productId} ${code}:`,
          err instanceof Error ? err.message : String(err)
        )
      }
    }
  }

  const markdown = renderReport(report, apply)
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  const outputPath = resolve(
    process.cwd(),
    `docs/operations/discovery-hubspot-products-prices-seed-${dateStamp}.md`
  )

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, markdown, 'utf-8')

  // eslint-disable-next-line no-console
  console.log(`[seed] Report written: ${outputPath}`)
  // eslint-disable-next-line no-console
  console.log(
    `[seed] Matched ${report.matchedProducts}/${report.totalHubSpotProducts} products, ${report.productsWithAnyHsPrice} with HS prices, ${report.outcomes.length} outcomes.`
  )
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('[seed] Fatal:', err)
  process.exit(1)
})
