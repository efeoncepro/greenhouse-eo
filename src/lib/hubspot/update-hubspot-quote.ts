import 'server-only'

import {
  updateHubSpotGreenhouseQuote,
  type HubSpotGreenhouseQuoteLineItemPayload,
  type HubSpotGreenhouseQuoteSender,
  type HubSpotGreenhouseUpdateQuoteRequest
} from '@/lib/integrations/hubspot-greenhouse-service'

// ── Types ──

export interface UpdateHubSpotQuoteInput {
  hubspotQuoteId: string
  title?: string | null
  expirationDate?: string | null
  sender?: HubSpotGreenhouseQuoteSender | null
  lineItems?: HubSpotGreenhouseQuoteLineItemPayload[]
}

export interface UpdateHubSpotQuoteResult {
  success: boolean
  error?: string
}

// ── Public API ──

/**
 * Update a HubSpot quote by delegating to the hubspot-greenhouse-integration Cloud Run
 * service (`PATCH /quotes/:id`).
 *
 * MVP stub (TASK-463 phase A): the downstream PATCH endpoint may not exist yet. In that
 * case, callers receive `{ success: false, error: 'update_not_supported' }` — the spec
 * (TASK-463 phase A) accepts this degraded outcome because the primary goal is the
 * **create** path on first push. Upserts downstream propagate once the endpoint ships.
 *
 * This function NEVER throws on "endpoint not implemented" (HTTP 404/405/501). It only
 * throws on real transport failures (network, timeout) so the caller can decide whether
 * to retry.
 */
export const updateHubSpotQuote = async (
  input: UpdateHubSpotQuoteInput
): Promise<UpdateHubSpotQuoteResult> => {
  const { hubspotQuoteId, title, expirationDate, sender, lineItems } = input

  if (!hubspotQuoteId) {
    return { success: false, error: 'missing_hubspot_quote_id' }
  }

  const body: HubSpotGreenhouseUpdateQuoteRequest = {}

  if (title !== undefined && title !== null) body.title = title
  if (expirationDate !== undefined && expirationDate !== null) body.expirationDate = expirationDate
  if (sender !== undefined && sender !== null) body.sender = sender

  if (lineItems !== undefined) {
    body.lineItems = lineItems
  }

  try {
    await updateHubSpotGreenhouseQuote(hubspotQuoteId, body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'update_transport_error'

    if (message.includes(' 404 ') || message.includes(' 405 ') || message.includes(' 501 ')) {
      console.warn('[update-hubspot-quote] downstream endpoint unavailable', {
        hubspotQuoteId,
        message
      })

      return { success: false, error: 'update_not_supported' }
    }

    return { success: false, error: message }
  }

  return { success: true }
}
