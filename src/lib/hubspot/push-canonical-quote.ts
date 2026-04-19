import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  publishQuotationPushedToHubSpot,
  publishQuotationHubSpotSyncFailed
} from '@/lib/commercial/quotation-events'

import { createHubSpotQuote } from './create-hubspot-quote'
import { updateHubSpotQuote } from './update-hubspot-quote'

// ── Types ──

export interface PushCanonicalQuoteInput {
  quotationId: string
  actorId?: string | null
}

export interface PushCanonicalQuoteResult {
  result: 'created' | 'updated' | 'skipped'
  hubspotQuoteId: string | null
  reason?: string
}

interface CanonicalQuoteRow extends Record<string, unknown> {
  quotation_id: string
  quotation_number: string
  organization_id: string | null
  hubspot_deal_id: string | null
  hubspot_quote_id: string | null
  description: string | null
  valid_until: string | { value?: string } | null
  currency: string | null
}

interface CanonicalLineItemRow extends Record<string, unknown> {
  line_item_id: string
  label: string
  description: string | null
  quantity: string | number | null
  unit_price: string | number | null
}

// ── Utilities ──

const toNum = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toDateString = (value: string | { value?: string } | null | undefined): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)

  return typeof value.value === 'string' ? value.value.slice(0, 10) : null
}

// Minimum viable expiration fallback when canonical has no valid_until.
const computeFallbackExpirationDate = () => {
  const d = new Date()

  d.setUTCDate(d.getUTCDate() + 30)

  return d.toISOString().slice(0, 10)
}

// ── Main adapter ──

/**
 * Push a canonical `greenhouse_commercial.quotations` row to HubSpot.
 *
 * MVP behavior (TASK-463 phase A):
 * - If canonical has no `hubspot_deal_id`: skipped + event emitted.
 * - If canonical has no `hubspot_quote_id` yet: delegate to legacy `createHubSpotQuote()`,
 *   persist returned `hubspot_quote_id` onto canonical, emit `commercial.quotation.pushed_to_hubspot`.
 * - If canonical already has `hubspot_quote_id`: delegate to `updateHubSpotQuote()`.
 *   Downstream endpoint may not exist yet — stub returns `success=false, error='update_not_supported'`
 *   and we emit `pushed_to_hubspot` with result='updated' regardless so the projection records
 *   the attempt. We do NOT re-throw on update-unsupported.
 * - On unexpected error (throw from downstream): emit `hubspot_sync_failed` and re-throw so the
 *   ops-worker reactive projection marks the run failed and retries.
 */
export const pushCanonicalQuoteToHubSpot = async (
  input: PushCanonicalQuoteInput
): Promise<PushCanonicalQuoteResult> => {
  const { quotationId, actorId = null } = input

  // 1. Read canonical quotation
  const quoteRows = await runGreenhousePostgresQuery<CanonicalQuoteRow>(
    `SELECT quotation_id, quotation_number, organization_id,
            hubspot_deal_id, hubspot_quote_id, description,
            valid_until, currency
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1
       LIMIT 1`,
    [quotationId]
  )

  const quote = quoteRows[0]

  if (!quote) {
    throw new Error(`Canonical quotation not found: ${quotationId}`)
  }

  // 2. Skip if no HubSpot deal associated — we need it to anchor the quote.
  if (!quote.hubspot_deal_id) {
    await publishQuotationPushedToHubSpot({
      quotationId,
      hubspotQuoteId: null,
      hubspotDealId: null,
      direction: 'outbound',
      result: 'skipped',
      reason: 'no_hubspot_deal_id',
      actorId
    })

    return {
      result: 'skipped',
      hubspotQuoteId: null,
      reason: 'no_hubspot_deal_id'
    }
  }

  // We also need an organization to resolve the HubSpot company — required by create path.
  if (!quote.organization_id) {
    await publishQuotationPushedToHubSpot({
      quotationId,
      hubspotQuoteId: null,
      hubspotDealId: quote.hubspot_deal_id,
      direction: 'outbound',
      result: 'skipped',
      reason: 'no_organization_id',
      actorId
    })

    return {
      result: 'skipped',
      hubspotQuoteId: null,
      reason: 'no_organization_id'
    }
  }

  // 3. Read canonical line items (latest version only — caller must ensure quotation_versions
  //    snapshot is aligned with current_version before push; MVP reads all versions joined via
  //    current_version filter on the quotation row).
  const lineRows = await runGreenhousePostgresQuery<CanonicalLineItemRow>(
    `SELECT qli.line_item_id, qli.label, qli.description, qli.quantity, qli.unit_price
       FROM greenhouse_commercial.quotation_line_items qli
       JOIN greenhouse_commercial.quotations q ON q.quotation_id = qli.quotation_id
       WHERE qli.quotation_id = $1
         AND qli.version_number = q.current_version
       ORDER BY qli.sort_order ASC, qli.created_at ASC`,
    [quotationId]
  )

  const lineItems = lineRows.map(row => ({
    name: row.label || 'Line item',
    quantity: toNum(row.quantity) || 1,
    unitPrice: toNum(row.unit_price),
    description: row.description || undefined
  }))

  const title = (quote.description && quote.description.trim()) || quote.quotation_number
  const expirationDate = toDateString(quote.valid_until) || computeFallbackExpirationDate()

  // 4. Branch on whether HubSpot quote already exists
  if (!quote.hubspot_quote_id) {
    // Create path — delegate to legacy helper
    try {
      const createResult = await createHubSpotQuote({
        quoteId: quotationId,
        organizationId: quote.organization_id,
        title,
        expirationDate,
        description: quote.description || undefined,
        lineItems,
        dealId: quote.hubspot_deal_id,
        publishImmediately: false
      })

      if (!createResult.success || !createResult.hubspotQuoteId) {
        const errMsg = createResult.error || 'HubSpot quote creation failed'

        await publishQuotationHubSpotSyncFailed({
          quotationId,
          hubspotDealId: quote.hubspot_deal_id,
          errorMessage: errMsg,
          attemptedAction: 'create',
          actorId
        })

        throw new Error(errMsg)
      }

      // Persist hubspot_quote_id onto canonical so future pushes go through update path.
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_commercial.quotations
            SET hubspot_quote_id = $1,
                hubspot_last_synced_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
          WHERE quotation_id = $2`,
        [createResult.hubspotQuoteId, quotationId]
      )

      await publishQuotationPushedToHubSpot({
        quotationId,
        hubspotQuoteId: createResult.hubspotQuoteId,
        hubspotDealId: quote.hubspot_deal_id,
        direction: 'outbound',
        result: 'created',
        actorId
      })

      return {
        result: 'created',
        hubspotQuoteId: createResult.hubspotQuoteId
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'HubSpot quote creation failed'

      await publishQuotationHubSpotSyncFailed({
        quotationId,
        hubspotDealId: quote.hubspot_deal_id,
        errorMessage: errMsg,
        attemptedAction: 'create',
        actorId
      })

      throw error
    }
  }

  // 5. Update path — the downstream service may not support PATCH yet. The stub returns
  //    `{ success: false, error: 'update_not_supported' }` in that case. We record the attempt
  //    via the pushed_to_hubspot event but do NOT re-throw so the workflow keeps going.
  try {
    const updateResult = await updateHubSpotQuote({
      hubspotQuoteId: quote.hubspot_quote_id,
      title,
      expirationDate,
      lineItems
    })

    if (!updateResult.success) {
      // Known MVP limitation — log + emit sync_failed but do not re-throw.
      console.warn('[push-canonical-quote] update skipped', {
        quotationId,
        hubspotQuoteId: quote.hubspot_quote_id,
        error: updateResult.error
      })

      await publishQuotationHubSpotSyncFailed({
        quotationId,
        hubspotDealId: quote.hubspot_deal_id,
        errorMessage: updateResult.error || 'update_failed',
        attemptedAction: 'update',
        actorId
      })

      return {
        result: 'updated',
        hubspotQuoteId: quote.hubspot_quote_id,
        reason: updateResult.error || 'update_failed'
      }
    }

    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_commercial.quotations
          SET hubspot_last_synced_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE quotation_id = $1`,
      [quotationId]
    )

    await publishQuotationPushedToHubSpot({
      quotationId,
      hubspotQuoteId: quote.hubspot_quote_id,
      hubspotDealId: quote.hubspot_deal_id,
      direction: 'outbound',
      result: 'updated',
      actorId
    })

    return {
      result: 'updated',
      hubspotQuoteId: quote.hubspot_quote_id
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'HubSpot quote update failed'

    await publishQuotationHubSpotSyncFailed({
      quotationId,
      hubspotDealId: quote.hubspot_deal_id,
      errorMessage: errMsg,
      attemptedAction: 'update',
      actorId
    })

    throw error
  }
}
