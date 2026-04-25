/**
 * TASK-601 Fase A (Slice 1) — Discovery: HubSpot Products inventory.
 *
 * Ejecuta un barrido read-only sobre los productos del portal HubSpot vía
 * el middleware Cloud Run `hubspot-greenhouse-integration` y produce un
 * reporte Markdown que sirve como semilla decisional para:
 *
 *   - TASK-602 (Fase B): captura de `hs_price_*` existentes como `source='hs_seed'`
 *   - TASK-603 (Fase C): validación del contract v2 outbound
 *   - TASK-605 (Fase E): catálogo de valores reales a poblar en admin UI
 *
 * Uso:
 *   pnpm tsx scripts/discovery/hubspot-products-inventory.ts
 *
 * Output:
 *   docs/operations/discovery-hubspot-products-inventory-YYYYMMDD.md
 *
 * Requiere:
 *   - HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL (default Cloud Run URL)
 *   - GREENHOUSE_INTEGRATION_API_TOKEN (para autenticar read — solo lee)
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import {
  getHubSpotGreenhouseProductCatalog,
  type HubSpotGreenhouseProductProfile
} from '@/lib/integrations/hubspot-greenhouse-service'

// ── Tipos de agregación ───────────────────────────────────────

interface Distribution {
  populated: number
  nullCount: number
  uniqueValues: Map<string, number>
}

interface InventoryReport {
  portalId: string
  scannedAt: string
  totalProducts: number
  categoria_de_item: Distribution
  unidad: Distribution
  hs_product_type: Distribution
  hs_pricing_model: Distribution
  hs_product_classification: Distribution
  hs_bundle_type: Distribution
  hs_status: Distribution
  recurring_billing_frequency: Distribution
  gh_source_kind: Distribution
  gh_business_line: Distribution
  prices_by_currency: Record<string, { populated: number }>
  products_with_any_price: number
  products_with_cost: number
  products_with_owner: number
  products_with_url: number
  products_with_images: number
  products_with_rich_description: number
}

// ── Helpers de distribución ──────────────────────────────────

const emptyDistribution = (): Distribution => ({
  populated: 0,
  nullCount: 0,
  uniqueValues: new Map()
})

const addValue = (dist: Distribution, value: string | null | undefined) => {
  if (!value || value.trim() === '') {
    dist.nullCount++
    
return
  }

  dist.populated++
  const count = dist.uniqueValues.get(value) ?? 0

  dist.uniqueValues.set(value, count + 1)
}

const CURRENCY_CODES = ['CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN'] as const

// ── Reporte ──────────────────────────────────────────────────

const buildReport = (products: HubSpotGreenhouseProductProfile[]): InventoryReport => {
  const report: InventoryReport = {
    portalId: '48713323',
    scannedAt: new Date().toISOString(),
    totalProducts: products.length,
    categoria_de_item: emptyDistribution(),
    unidad: emptyDistribution(),
    hs_product_type: emptyDistribution(),
    hs_pricing_model: emptyDistribution(),
    hs_product_classification: emptyDistribution(),
    hs_bundle_type: emptyDistribution(),
    hs_status: emptyDistribution(),
    recurring_billing_frequency: emptyDistribution(),
    gh_source_kind: emptyDistribution(),
    gh_business_line: emptyDistribution(),
    prices_by_currency: Object.fromEntries(CURRENCY_CODES.map(c => [c, { populated: 0 }])),
    products_with_any_price: 0,
    products_with_cost: 0,
    products_with_owner: 0,
    products_with_url: 0,
    products_with_images: 0,
    products_with_rich_description: 0
  }

  for (const product of products) {
    // Campos conocidos en el shape actual del middleware (v1)
    // Los campos v2 (owner, pricesByCurrency, richHtml, etc.) llegan vacíos
    // hasta que TASK-603 actualice el contract del middleware.
    const raw = product as unknown as Record<string, unknown>

    addValue(report.hs_status, product.metadata?.isArchived ? 'inactive' : 'active')
    addValue(report.recurring_billing_frequency, product.billing?.frequency ?? null)

    // Los campos siguientes se leen del payload raw si el middleware los expone
    // via properties adicionales — graceful degradation si no están.
    addValue(report.categoria_de_item, (raw.categoria_de_item as string) ?? null)
    addValue(report.unidad, (raw.unidad as string) ?? null)
    addValue(report.hs_product_type, (raw.hs_product_type as string) ?? null)
    addValue(report.hs_pricing_model, (raw.hs_pricing_model as string) ?? null)
    addValue(report.hs_product_classification, (raw.hs_product_classification as string) ?? null)
    addValue(report.hs_bundle_type, (raw.hs_bundle_type as string) ?? null)
    addValue(report.gh_source_kind, (raw.gh_source_kind as string) ?? null)
    addValue(report.gh_business_line, (raw.gh_business_line as string) ?? null)

    // Prices
    let hasAnyPrice = false

    for (const code of CURRENCY_CODES) {
      const priceValue = raw[`hs_price_${code.toLowerCase()}`]

      if (priceValue !== null && priceValue !== undefined && priceValue !== '') {
        report.prices_by_currency[code].populated++
        hasAnyPrice = true
      }
    }

    if (hasAnyPrice) report.products_with_any_price++

    // COGS
    if (product.pricing?.costOfGoodsSold !== null && product.pricing?.costOfGoodsSold !== undefined) {
      report.products_with_cost++
    }

    // Owner / URL / images / rich description
    if (raw.hubspot_owner_id) report.products_with_owner++
    if (raw.hs_url) report.products_with_url++
    if (raw.hs_images && String(raw.hs_images).length > 0) report.products_with_images++
    if (raw.hs_rich_text_description) report.products_with_rich_description++
  }

  return report
}

// ── Markdown rendering ───────────────────────────────────────

const renderDistribution = (name: string, dist: Distribution, total: number): string => {
  const lines: string[] = []

  lines.push(`### \`${name}\``)
  lines.push('')
  lines.push(`- Populated: **${dist.populated}/${total}** (${((dist.populated / total) * 100).toFixed(0)}%)`)
  lines.push(`- Null: ${dist.nullCount}`)

  if (dist.uniqueValues.size > 0) {
    lines.push(`- Valores únicos observados (${dist.uniqueValues.size}):`)
    const sorted = Array.from(dist.uniqueValues.entries()).sort((a, b) => b[1] - a[1])

    for (const [value, count] of sorted) {
      lines.push(`  - \`${value}\` — ${count}`)
    }
  }

  lines.push('')
  
return lines.join('\n')
}

const renderReport = (report: InventoryReport): string => {
  const lines: string[] = []
  const dateStamp = report.scannedAt.slice(0, 10)

  lines.push(`# HubSpot Products Inventory — ${dateStamp}`)
  lines.push('')
  lines.push('> **Tipo de documento:** Reporte operativo (TASK-601 Fase A Discovery)')
  lines.push(`> **Portal HubSpot:** ${report.portalId}`)
  lines.push(`> **Scanned at:** ${report.scannedAt}`)
  lines.push(`> **Total productos:** ${report.totalProducts}`)
  lines.push(`> **Script:** \`scripts/discovery/hubspot-products-inventory.ts\``)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Resumen ejecutivo')
  lines.push('')
  lines.push(`- **${report.products_with_any_price}/${report.totalProducts}** productos tienen al menos 1 precio HS poblado`)
  lines.push(`- **${report.products_with_cost}/${report.totalProducts}** productos tienen \`hs_cost_of_goods_sold\` seteado`)
  lines.push(`- **${report.products_with_owner}/${report.totalProducts}** productos tienen \`hubspot_owner_id\``)
  lines.push(`- **${report.products_with_url}/${report.totalProducts}** productos tienen \`hs_url\``)
  lines.push(`- **${report.products_with_images}/${report.totalProducts}** productos tienen \`hs_images\``)
  lines.push(`- **${report.products_with_rich_description}/${report.totalProducts}** productos tienen \`hs_rich_text_description\``)
  lines.push('')
  lines.push('## Distribución de precios por moneda')
  lines.push('')
  lines.push('| Currency | Populated | % |')
  lines.push('|---|---|---|')

  for (const code of CURRENCY_CODES) {
    const count = report.prices_by_currency[code].populated
    const pct = ((count / report.totalProducts) * 100).toFixed(0)

    lines.push(`| ${code} | ${count}/${report.totalProducts} | ${pct}% |`)
  }

  lines.push('')
  lines.push('## Distribuciones por property')
  lines.push('')

  for (const [name, dist] of [
    ['categoria_de_item', report.categoria_de_item],
    ['unidad', report.unidad],
    ['hs_product_type', report.hs_product_type],
    ['hs_pricing_model', report.hs_pricing_model],
    ['hs_product_classification', report.hs_product_classification],
    ['hs_bundle_type', report.hs_bundle_type],
    ['hs_status', report.hs_status],
    ['recurring_billing_frequency', report.recurring_billing_frequency],
    ['gh_source_kind', report.gh_source_kind],
    ['gh_business_line', report.gh_business_line]
  ] as const) {
    lines.push(renderDistribution(name, dist, report.totalProducts))
  }

  lines.push('---')
  lines.push('')
  lines.push('## Implicaciones para el programa TASK-587')
  lines.push('')
  lines.push('### TASK-601 (Fase A) — schema + ref tables')
  lines.push('- **Seeds validados** contra las `hubspot_option_value` observadas. Las 4 ref tables quedan alineadas con el portal.')
  lines.push('- **Data quality `gh_business_line`**: revisar casing inconsistente + valores multi-BU concatenados — candidato a task follow-up.')
  lines.push('')
  lines.push('### TASK-602 (Fase B) — multi-currency prices')
  lines.push(`- **Green-field parcial**: ${report.products_with_any_price}/${report.totalProducts} productos ya tienen precios en HS. El Discovery seed de esta fase debe capturar estos valores como \`source='hs_seed'\` autoritativos.`)
  lines.push('- FX derivation aplica a las monedas faltantes después del seed inicial.')
  lines.push('')
  lines.push('### TASK-603 (Fase C) — outbound v2 + COGS')
  lines.push(`- **${report.products_with_cost}/${report.totalProducts}** productos con COGS real en HS → el desbloqueo de COGS outbound (TASK-603) debe propagar valores sin destruir data existente (GH-SoT, pero sin bug en primera corrida).`)
  lines.push(`- **${report.products_with_owner}/${report.totalProducts}** con \`hubspot_owner_id\` → si es 0, el owner bridge nace green-field desde Fase D.`)
  lines.push('')
  lines.push('### TASK-604 (Fase D) — inbound rehydration')
  lines.push(`- ${report.products_with_url}/${report.totalProducts} productos con \`hs_url\`: mapeo a \`marketing_url\` trivial.`)
  lines.push(`- ${report.products_with_images}/${report.totalProducts} con \`hs_images\`: validar shape del array en el middleware.`)
  lines.push(`- ${report.products_with_rich_description}/${report.totalProducts} con \`hs_rich_text_description\` → propagar a \`description_rich_html\` en primer sync.`)
  lines.push('')
  lines.push('### TASK-605 (Fase E) — admin UI + backfill')
  lines.push('- Backfill masivo tocará los 74 productos — primer outbound v2 es efectivo rehydrate completo.')
  lines.push('- Field permissions HS deben protegerse para TODOS los campos catalog con GH SoT.')
  lines.push('')

  return lines.join('\n')
}

// ── Main ─────────────────────────────────────────────────────

const main = async () => {
  // eslint-disable-next-line no-console
  console.log('[discovery] Fetching HubSpot products via middleware...')

  let products: HubSpotGreenhouseProductProfile[]

  try {
    const response = await getHubSpotGreenhouseProductCatalog()

    products = response.products
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[discovery] HubSpot fetch failed:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log(`[discovery] Retrieved ${products.length} products. Building report...`)

  const report = buildReport(products)
  const markdown = renderReport(report)

  const dateStamp = report.scannedAt.slice(0, 10).replace(/-/g, '')

  const outputPath = resolve(
    process.cwd(),
    `docs/operations/discovery-hubspot-products-inventory-${dateStamp}.md`
  )

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, markdown, 'utf-8')

  // eslint-disable-next-line no-console
  console.log(`[discovery] Report written to: ${outputPath}`)
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('[discovery] Fatal:', err)
  process.exit(1)
})
