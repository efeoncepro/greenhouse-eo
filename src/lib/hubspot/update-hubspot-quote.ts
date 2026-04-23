import 'server-only'

import {
  updateHubSpotGreenhouseQuote,
  type HubSpotGreenhouseCreateQuoteRequest
} from '@/lib/integrations/hubspot-greenhouse-service'
import type { HubSpotQuoteSender, HubSpotQuoteWriteLineItem } from '@/lib/hubspot/hubspot-quote-sync'

// ── Types ──

export interface UpdateHubSpotQuoteInput {
  hubspotQuoteId: string
  title?: string | null
  expirationDate?: string | null
  currency?: string | null
  status?: string | null
  sender?: HubSpotQuoteSender | null
  lineItems?: HubSpotQuoteWriteLineItem[]
}

export interface UpdateHubSpotQuoteResult {
  success: boolean
  quoteNumber?: string | null
  quoteStatus?: string | null
  quoteLink?: string | null
  pdfDownloadLink?: string | null
  locked?: boolean | null
  error?: string
}

// ── Public API ──

/**
 * Auth-safe wrapper over the sibling HubSpot bridge PATCH /quotes/:id endpoint.
 */
export const updateHubSpotQuote = async (
  input: UpdateHubSpotQuoteInput
): Promise<UpdateHubSpotQuoteResult> => {
  const { hubspotQuoteId, title, expirationDate, currency, status, sender, lineItems } = input

  if (!hubspotQuoteId) {
    return { success: false, error: 'missing_hubspot_quote_id' }
  }

  const payload: Partial<HubSpotGreenhouseCreateQuoteRequest> = {}

  if (title !== undefined && title !== null) payload.title = title
  if (expirationDate !== undefined && expirationDate !== null) payload.expirationDate = expirationDate
  if (currency !== undefined && currency !== null) payload.currency = currency
  if (status !== undefined && status !== null) payload.status = status
  if (sender) payload.sender = sender

  if (lineItems !== undefined) {
    payload.lineItems = lineItems.map(li => ({
      hubspotLineItemId: li.hubspotLineItemId,
      hubspotProductId: li.hubspotProductId,
      productId: li.productId,
      name: li.name,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      description: li.description,
      discount: li.discount ?? undefined,
      productCode: li.productCode ?? undefined,
      legacySku: li.legacySku ?? undefined,
      billingFrequency: li.billingFrequency ?? undefined,
      billingStartDate: li.billingStartDate ?? undefined,
      taxRate: li.taxRate ?? undefined,
      taxRateGroupId: li.taxRateGroupId ?? undefined,
      taxAmount: li.taxAmount ?? undefined,
      currency: li.currency ?? undefined
    }))
  }

  try {
    const response = await updateHubSpotGreenhouseQuote(hubspotQuoteId, payload)

    if (response.status === 'endpoint_not_deployed') {
      return { success: false, error: 'update_not_supported' }
    }

    return {
      success: true,
      quoteNumber: response.quoteNumber ?? null,
      quoteStatus: response.quoteStatus ?? null,
      quoteLink: response.quoteLink ?? null,
      pdfDownloadLink: response.pdfDownloadLink ?? null,
      locked: response.locked ?? null
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'update_transport_error'

    return { success: false, error: message }
  }
}
