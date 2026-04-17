import 'server-only'

import { createHubSpotGreenhouseProduct } from '@/lib/integrations/hubspot-greenhouse-service'
import { syncCanonicalFinanceProduct } from '@/lib/finance/quotation-canonical-store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

// ── Types ──

export type CreateHubSpotProductInput = {
  name: string
  sku: string
  description?: string
  unitPrice?: number
  costOfGoodsSold?: number
  tax?: number
  isRecurring?: boolean
  billingFrequency?: string
  billingPeriodCount?: number
  createdBy?: string
}

export type CreateHubSpotProductResult = {
  success: boolean
  productId: string | null
  hubspotProductId: string | null
  error: string | null
}

// ── Core creation logic ──

export const createHubSpotProduct = async (input: CreateHubSpotProductInput): Promise<CreateHubSpotProductResult> => {
  const { name, sku, description, unitPrice, costOfGoodsSold, tax, isRecurring, billingFrequency, billingPeriodCount, createdBy } = input

  // 1. Call Cloud Run to create in HubSpot
  let hubspotProductId: string | null = null

  try {
    const response = await createHubSpotGreenhouseProduct({
      name,
      sku,
      description,
      unitPrice,
      costOfGoodsSold,
      tax,
      isRecurring,
      billingFrequency,
      billingPeriodCount
    })

    hubspotProductId = response.hubspotProductId
  } catch (error) {
    return {
      success: false,
      productId: null,
      hubspotProductId: null,
      error: error instanceof Error ? error.message : 'HubSpot product creation failed'
    }
  }

  // 2. Persist locally
  const productId = `GH-PROD-${hubspotProductId}`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_finance.products (
      product_id, source_system, name, sku, description,
      unit_price, cost_of_goods_sold, tax_rate,
      is_recurring, billing_frequency, billing_period_count,
      is_active, hubspot_product_id, hubspot_last_synced_at,
      created_by, created_at, updated_at
    ) VALUES (
      $1, 'hubspot', $2, $3, $4,
      $5, $6, $7,
      $8, $9, $10,
      TRUE, $11, NOW(),
      $12, NOW(), NOW()
    )
    ON CONFLICT (product_id) DO UPDATE SET
      name = EXCLUDED.name,
      sku = EXCLUDED.sku,
      description = EXCLUDED.description,
      unit_price = EXCLUDED.unit_price,
      cost_of_goods_sold = EXCLUDED.cost_of_goods_sold,
      hubspot_last_synced_at = NOW(),
      updated_at = NOW()`,
    [
      productId, name, sku, description || null,
      unitPrice ?? null, costOfGoodsSold ?? null, tax ?? 0.19,
      isRecurring ?? false, billingFrequency || null, billingPeriodCount ?? null,
      hubspotProductId, createdBy || null
    ]
  )

  await syncCanonicalFinanceProduct({ productId })

  // 3. Outbox event
  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.product,
    aggregateId: productId,
    eventType: EVENT_TYPES.productCreated,
    payload: {
      productId,
      hubspotProductId,
      name,
      sku,
      direction: 'outbound'
    }
  })

  return {
    success: true,
    productId,
    hubspotProductId,
    error: null
  }
}
