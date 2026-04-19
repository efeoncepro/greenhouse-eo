import 'server-only'

// ── Types ──

export interface UpdateHubSpotQuoteInput {
  hubspotQuoteId: string
  title?: string | null
  expirationDate?: string | null
  lineItems?: Array<{
    name: string
    quantity: number
    unitPrice: number
    description?: string | null
  }>
}

export interface UpdateHubSpotQuoteResult {
  success: boolean
  error?: string
}

// ── Config ──

const DEFAULT_BASE_URL = 'https://hubspot-greenhouse-integration-183008134038.us-central1.run.app'
const DEFAULT_TIMEOUT_MS = 4000

const normalizeBaseUrl = (value: string | undefined) => {
  const normalized = value?.trim().replace(/\/+$/, '')

  return normalized || DEFAULT_BASE_URL
}

const parseTimeoutMs = (value: string | undefined) => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS
  }

  return Math.floor(parsed)
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
  const { hubspotQuoteId, title, expirationDate, lineItems } = input

  if (!hubspotQuoteId) {
    return { success: false, error: 'missing_hubspot_quote_id' }
  }

  const baseUrl = normalizeBaseUrl(process.env.HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL)
  const timeoutMs = parseTimeoutMs(process.env.HUBSPOT_GREENHOUSE_INTEGRATION_TIMEOUT_MS)

  const body: Record<string, unknown> = {}

  if (title !== undefined && title !== null) body.title = title
  if (expirationDate !== undefined && expirationDate !== null) body.expirationDate = expirationDate

  if (lineItems !== undefined) {
    body.lineItems = lineItems.map(li => ({
      name: li.name,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      description: li.description ?? undefined
    }))
  }

  let response: Response

  try {
    response = await fetch(`${baseUrl}/quotes/${encodeURIComponent(hubspotQuoteId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(timeoutMs)
    })
  } catch (error) {
    // Transport-level failure (network, timeout). Let the caller decide whether to retry.
    const message = error instanceof Error ? error.message : 'update_transport_error'

    return { success: false, error: message }
  }

  if (response.ok) {
    return { success: true }
  }

  // Endpoint not deployed yet — treat as "update_not_supported" per MVP spec so the
  // caller doesn't error out the whole flow.
  if (response.status === 404 || response.status === 405 || response.status === 501) {
    console.warn('[update-hubspot-quote] downstream endpoint unavailable', {
      hubspotQuoteId,
      status: response.status
    })

    return { success: false, error: 'update_not_supported' }
  }

  const bodyText = await response.text().catch(() => '')

  return {
    success: false,
    error: `HubSpot integration service returned ${response.status} for PATCH /quotes/${hubspotQuoteId}: ${bodyText || response.statusText}`
  }
}
