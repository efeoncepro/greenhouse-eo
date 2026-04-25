/**
 * Backfill script: Sync HubSpot product catalog to greenhouse_finance.products
 *
 * Usage:
 *   pnpm pg:connect                       # Start proxy
 *   HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL=https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app \
 *     npx tsx --env-file=.env.local scripts/backfill-hubspot-products.ts
 *
 * Safe to run multiple times (idempotent via ON CONFLICT).
 */

import 'dotenv/config'
import { randomUUID } from 'node:crypto'

async function main() {
  console.log('=== HubSpot Products Backfill ===')
  console.log(`Started at: ${new Date().toISOString()}`)

  const baseUrl = process.env.HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL

  if (!baseUrl) {
    console.error('ERROR: HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL not set')
    process.exit(1)
  }

  const pgHost = process.env.GREENHOUSE_POSTGRES_HOST

  if (!pgHost) {
    console.error('ERROR: GREENHOUSE_POSTGRES_HOST not set')
    process.exit(1)
  }

  console.log(`Cloud Run: ${baseUrl}`)
  console.log()

  const { runGreenhousePostgresQuery } = await import('../src/lib/postgres/client')

  // Fetch product catalog
  const response = await fetch(`${baseUrl}/products`, {
    signal: AbortSignal.timeout(15000)
  })

  if (!response.ok) {
    console.error(`Cloud Run error: ${response.status}`)
    process.exit(1)
  }

  interface ProductProfile {
    identity: { productId: string; name: string | null; sku: string | null; hubspotProductId: string }
    pricing: { unitPrice: number | null; costOfGoodsSold: number | null; tax: number | null }
    billing: { isRecurring: boolean; frequency: string | null; periodCount: number | null }
    metadata: { description: string | null; isArchived: boolean }
  }

  const data: { products: ProductProfile[] } = await response.json()
  const products = data.products ?? []

  console.log(`Found ${products.length} products in HubSpot`)

  let created = 0
  let updated = 0

  for (const p of products) {
    const hsId = p.identity.hubspotProductId

    if (!hsId) continue

    const productId = `GH-PROD-${hsId}`
    const name = p.identity.name || `Product ${hsId}`

    const result = await runGreenhousePostgresQuery<{ action: string }>(
      `INSERT INTO greenhouse_finance.products (
        product_id, source_system, name, sku, description,
        unit_price, cost_of_goods_sold, tax_rate,
        is_recurring, billing_frequency, billing_period_count,
        is_active, hubspot_product_id, hubspot_last_synced_at,
        created_at, updated_at
      ) VALUES (
        $1, 'hubspot', $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12, NOW(),
        NOW(), NOW()
      )
      ON CONFLICT (product_id) DO UPDATE SET
        name = EXCLUDED.name, sku = EXCLUDED.sku, description = EXCLUDED.description,
        unit_price = EXCLUDED.unit_price, cost_of_goods_sold = EXCLUDED.cost_of_goods_sold,
        is_recurring = EXCLUDED.is_recurring, is_active = EXCLUDED.is_active,
        hubspot_last_synced_at = NOW(), updated_at = NOW()
      RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action`,
      [
        productId, name, p.identity.sku || null, p.metadata.description || null,
        p.pricing.unitPrice ?? null, p.pricing.costOfGoodsSold ?? null, p.pricing.tax ?? 0.19,
        p.billing.isRecurring, p.billing.frequency || null,
        p.billing.periodCount ? Math.floor(p.billing.periodCount) : null,
        !p.metadata.isArchived, hsId
      ]
    )

    const action = result[0]?.action

    if (action === 'created') {
      created++

      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_sync.outbox_events (
          event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at
        ) VALUES ($1, 'product', $2, 'finance.product.synced', $3::jsonb, 'pending', NOW())`,
        [`outbox-${randomUUID()}`, productId, JSON.stringify({ productId, hubspotProductId: hsId, name, action: 'created' })]
      )
    } else if (action === 'updated') {
      updated++
    }
  }

  console.log()
  console.log(`Products created: ${created}`)
  console.log(`Products updated: ${updated}`)
  console.log(`Finished at: ${new Date().toISOString()}`)

  // Now sync line items for existing HubSpot quotes
  console.log()
  console.log('=== Syncing Line Items for existing HubSpot quotes ===')

  const quotes = await runGreenhousePostgresQuery<{ quote_id: string; hubspot_quote_id: string }>(
    `SELECT quote_id, hubspot_quote_id FROM greenhouse_finance.quotes
     WHERE source_system = 'hubspot' AND hubspot_quote_id IS NOT NULL`
  )

  console.log(`Found ${quotes.length} HubSpot quotes to sync line items for`)

  let liCreated = 0
  let liErrors = 0

  for (const q of quotes) {
    try {
      const liResponse = await fetch(`${baseUrl}/quotes/${q.hubspot_quote_id}/line-items`, {
        signal: AbortSignal.timeout(10000)
      })

      if (!liResponse.ok) {
        if (liResponse.status === 404) continue

        liErrors++
        continue
      }

      interface LineItemProfile {
        identity: { lineItemId: string; hubspotLineItemId: string; hubspotProductId: string | null }
        content: { name: string | null; description: string | null; quantity: number; unitPrice: number; discountPercent: number | null; discountAmount: number | null; taxAmount: number | null; totalAmount: number }
      }

      const liData: { lineItems: LineItemProfile[] } = await liResponse.json()

      for (let i = 0; i < (liData.lineItems ?? []).length; i++) {
        const li = liData.lineItems[i]
        const hsLiId = li.identity.hubspotLineItemId

        if (!hsLiId) continue

        const lineItemId = `GH-LI-${hsLiId}`

        // Resolve product FK
        let localProductId: string | null = null

        if (li.identity.hubspotProductId) {
          const prodRows = await runGreenhousePostgresQuery<{ product_id: string }>(
            `SELECT product_id FROM greenhouse_finance.products WHERE hubspot_product_id = $1 LIMIT 1`,
            [li.identity.hubspotProductId]
          )

          localProductId = prodRows[0]?.product_id ?? null
        }

        const liResult = await runGreenhousePostgresQuery<{ action: string }>(
          `INSERT INTO greenhouse_finance.quote_line_items (
            line_item_id, quote_id, product_id, source_system,
            line_number, name, description,
            quantity, unit_price, discount_percent, discount_amount,
            tax_amount, total_amount,
            hubspot_line_item_id, hubspot_product_id, hubspot_last_synced_at,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, 'hubspot',
            $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12,
            $13, $14, NOW(),
            NOW(), NOW()
          )
          ON CONFLICT (line_item_id) DO UPDATE SET
            product_id = EXCLUDED.product_id, name = EXCLUDED.name,
            quantity = EXCLUDED.quantity, unit_price = EXCLUDED.unit_price,
            total_amount = EXCLUDED.total_amount,
            hubspot_last_synced_at = NOW(), updated_at = NOW()
          RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action`,
          [
            lineItemId, q.quote_id, localProductId,
            i + 1, li.content.name || `Item ${hsLiId}`, li.content.description || null,
            li.content.quantity, li.content.unitPrice,
            li.content.discountPercent ?? 0, li.content.discountAmount ?? 0,
            li.content.taxAmount ?? 0, li.content.totalAmount,
            hsLiId, li.identity.hubspotProductId || null
          ]
        )

        if (liResult[0]?.action === 'created') liCreated++
      }

      console.log(`  ${q.quote_id}: ${(liData.lineItems ?? []).length} line items`)
    } catch (err) {
      console.error(`  ${q.quote_id}: ${err instanceof Error ? err.message : String(err)}`)
      liErrors++
    }
  }

  console.log()
  console.log(`Line items created: ${liCreated}`)
  console.log(`Line item errors: ${liErrors}`)

  process.exit(0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
