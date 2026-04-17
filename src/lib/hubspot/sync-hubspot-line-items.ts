import 'server-only'

import {
  getHubSpotGreenhouseQuoteLineItems,
  type HubSpotGreenhouseLineItemProfile
} from '@/lib/integrations/hubspot-greenhouse-service'
import { syncCanonicalFinanceQuote } from '@/lib/finance/quotation-canonical-store'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { publishQuoteLineItemsSynced } from '@/lib/commercial/quotation-events'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Resolve product_id from hubspot_product_id ──

const resolveProductId = async (hubspotProductId: string): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ product_id: string }>(
    `SELECT product_id FROM greenhouse_finance.products WHERE hubspot_product_id = $1 LIMIT 1`,
    [hubspotProductId]
  )

  return rows[0]?.product_id ?? null
}

// ── Upsert single line item ──

const upsertLineItemFromHubSpot = async (
  li: HubSpotGreenhouseLineItemProfile,
  quoteId: string,
  lineNumber: number
): Promise<'created' | 'updated' | 'skipped'> => {
  const hubspotLineItemId = li.identity.hubspotLineItemId

  if (!hubspotLineItemId) return 'skipped'

  const lineItemId = `GH-LI-${hubspotLineItemId}`
  const name = li.content.name || `Item ${hubspotLineItemId}`

  // Resolve product FK if line item references a HubSpot product
  let productId: string | null = null

  if (li.identity.hubspotProductId) {
    productId = await resolveProductId(li.identity.hubspotProductId)
  }

  const result = await runGreenhousePostgresQuery<{ action: string }>(
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
      product_id = EXCLUDED.product_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      quantity = EXCLUDED.quantity,
      unit_price = EXCLUDED.unit_price,
      discount_percent = EXCLUDED.discount_percent,
      discount_amount = EXCLUDED.discount_amount,
      tax_amount = EXCLUDED.tax_amount,
      total_amount = EXCLUDED.total_amount,
      hubspot_product_id = EXCLUDED.hubspot_product_id,
      hubspot_last_synced_at = NOW(),
      updated_at = NOW()
    RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action`,
    [
      lineItemId, quoteId, productId,
      lineNumber, name, li.content.description || null,
      li.content.quantity, li.content.unitPrice,
      li.content.discountPercent ?? 0, li.content.discountAmount ?? 0,
      li.content.taxAmount ?? 0, li.content.totalAmount,
      hubspotLineItemId, li.identity.hubspotProductId || null
    ]
  )

  return (result[0]?.action ?? 'skipped') as 'created' | 'updated' | 'skipped'
}

// ── Public API ──

export interface LineItemSyncResult {
  quoteId: string
  created: number
  updated: number
  skipped: number
  errors: string[]
}

/**
 * Sync line items for a specific quote from HubSpot.
 * Called after the quote itself is synced (TASK-210 sync-hubspot-quotes.ts).
 */
export const syncQuoteLineItems = async (
  quoteId: string,
  hubspotQuoteId: string
): Promise<LineItemSyncResult> => {
  const result: LineItemSyncResult = { quoteId, created: 0, updated: 0, skipped: 0, errors: [] }

  let lineItems: HubSpotGreenhouseLineItemProfile[]

  try {
    const response = await getHubSpotGreenhouseQuoteLineItems(hubspotQuoteId)

    lineItems = response.lineItems
  } catch (err) {
    result.errors.push(`HubSpot API error: ${err instanceof Error ? err.message : String(err)}`)

    return result
  }

  for (let i = 0; i < lineItems.length; i++) {
    const li = lineItems[i]

    try {
      const action = await upsertLineItemFromHubSpot(li, quoteId, i + 1)

      if (action === 'created') result.created++
      else if (action === 'updated') result.updated++
      else result.skipped++
    } catch (err) {
      result.errors.push(`LineItem ${li.identity.lineItemId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (result.created > 0 || result.updated > 0) {
    await syncCanonicalFinanceQuote({ quoteId })

    const identity = await resolveQuotationIdentity(quoteId).catch(() => null)

    await publishQuoteLineItemsSynced({
      quoteId,
      quotationId: identity?.quotationId ?? null,
      hubspotQuoteId,
      created: result.created,
      updated: result.updated
    })
  }

  return result
}
