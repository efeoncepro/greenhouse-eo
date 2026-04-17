import 'server-only'

import {
  getHubSpotGreenhouseProductCatalog,
  type HubSpotGreenhouseProductProfile
} from '@/lib/integrations/hubspot-greenhouse-service'
import { syncCanonicalFinanceProduct } from '@/lib/finance/quotation-canonical-store'
import { getCommercialProduct } from '@/lib/commercial/product-catalog-store'
import { publishProductSynced } from '@/lib/commercial/quotation-events'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Upsert single product ──

const upsertProductFromHubSpot = async (
  product: HubSpotGreenhouseProductProfile
): Promise<'created' | 'updated' | 'skipped'> => {
  const hubspotProductId = product.identity.hubspotProductId

  if (!hubspotProductId) return 'skipped'

  const productId = `GH-PROD-${hubspotProductId}`
  const name = product.identity.name || `Product ${hubspotProductId}`
  const sku = product.identity.sku || null
  const unitPrice = product.pricing.unitPrice ?? null
  const cogs = product.pricing.costOfGoodsSold ?? null
  const tax = product.pricing.tax ?? null
  const isRecurring = product.billing.isRecurring
  const frequency = product.billing.frequency || null
  const periodCount = product.billing.periodCount ? Math.floor(product.billing.periodCount) : null
  const description = product.metadata.description || null
  const isActive = !product.metadata.isArchived

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
      name = EXCLUDED.name,
      sku = EXCLUDED.sku,
      description = EXCLUDED.description,
      unit_price = EXCLUDED.unit_price,
      cost_of_goods_sold = EXCLUDED.cost_of_goods_sold,
      tax_rate = EXCLUDED.tax_rate,
      is_recurring = EXCLUDED.is_recurring,
      billing_frequency = EXCLUDED.billing_frequency,
      billing_period_count = EXCLUDED.billing_period_count,
      is_active = EXCLUDED.is_active,
      hubspot_last_synced_at = NOW(),
      updated_at = NOW()
    RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action`,
    [
      productId, name, sku, description,
      unitPrice, cogs, tax,
      isRecurring, frequency, periodCount,
      isActive, hubspotProductId
    ]
  )

  const action = (result[0]?.action ?? 'skipped') as 'created' | 'updated' | 'skipped'

  // Canonical publish deferred to the caller (syncHubSpotProductCatalog) so the
  // commercial product_id bridge has been populated before emitting.

  return action
}

// ── Public API ──

export interface ProductSyncResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export const syncHubSpotProductCatalog = async (): Promise<ProductSyncResult> => {
  const result: ProductSyncResult = { created: 0, updated: 0, skipped: 0, errors: [] }

  let products: HubSpotGreenhouseProductProfile[]

  try {
    const response = await getHubSpotGreenhouseProductCatalog()

    products = response.products
  } catch (err) {
    result.errors.push(`HubSpot API error: ${err instanceof Error ? err.message : String(err)}`)

    return result
  }

  for (const product of products) {
    try {
      const action = await upsertProductFromHubSpot(product)
      const hubspotProductId = product.identity.hubspotProductId

      if (action === 'created') result.created++
      else if (action === 'updated') result.updated++
      else result.skipped++

      if ((action === 'created' || action === 'updated') && hubspotProductId) {
        const financeProductId = `GH-PROD-${hubspotProductId}`

        await syncCanonicalFinanceProduct({ productId: financeProductId })

        const canonical = await getCommercialProduct(financeProductId).catch(() => null)

        await publishProductSynced({
          productId: financeProductId,
          hubspotProductId,
          name: product.identity.name ?? null,
          sku: product.identity.sku ?? null,
          commercialProductId: canonical?.productId ?? null,
          action
        })
      }
    } catch (err) {
      result.errors.push(`Product ${product.identity.productId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}
