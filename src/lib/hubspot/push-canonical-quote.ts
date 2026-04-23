import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  publishQuotationPushedToHubSpot,
  publishQuotationHubSpotSyncFailed
} from '@/lib/commercial/quotation-events'
import { resolveHubSpotQuoteSyncPayload } from '@/lib/hubspot/hubspot-quote-sync'

import { createHubSpotQuote } from './create-hubspot-quote'
import { updateHubSpotQuote } from './update-hubspot-quote'

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
  organization_id: string | null
  hubspot_deal_id: string | null
  hubspot_quote_id: string | null
}

const persistHubSpotQuoteState = async ({
  quotationId,
  hubspotQuoteId,
  hubspotQuoteStatus,
  hubspotQuoteLink,
  hubspotPdfDownloadLink,
  hubspotQuoteLocked
}: {
  quotationId: string
  hubspotQuoteId: string
  hubspotQuoteStatus: string | null
  hubspotQuoteLink: string | null
  hubspotPdfDownloadLink: string | null
  hubspotQuoteLocked: boolean | null
}) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_commercial.quotations
        SET hubspot_quote_id = $1,
            hubspot_quote_status = $2,
            hubspot_quote_link = $3,
            hubspot_quote_pdf_download_link = $4,
            hubspot_quote_locked = $5,
            hubspot_last_synced_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE quotation_id = $6`,
    [
      hubspotQuoteId,
      hubspotQuoteStatus,
      hubspotQuoteLink,
      hubspotPdfDownloadLink,
      hubspotQuoteLocked,
      quotationId
    ]
  )
}

export const pushCanonicalQuoteToHubSpot = async (
  input: PushCanonicalQuoteInput
): Promise<PushCanonicalQuoteResult> => {
  const { quotationId, actorId = null } = input

  const quoteRows = await runGreenhousePostgresQuery<CanonicalQuoteRow>(
    `SELECT quotation_id, organization_id, hubspot_deal_id, hubspot_quote_id
       FROM greenhouse_commercial.quotations
      WHERE quotation_id = $1
      LIMIT 1`,
    [quotationId]
  )

  const quote = quoteRows[0]

  if (!quote) {
    throw new Error(`Canonical quotation not found: ${quotationId}`)
  }

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

  const syncPayload = await resolveHubSpotQuoteSyncPayload({
    quotationId,
    actorId
  })

  if (!quote.hubspot_quote_id) {
    try {
      const createResult = await createHubSpotQuote({
        quoteId: quotationId,
        organizationId: syncPayload.organizationId,
        title: syncPayload.title,
        expirationDate: syncPayload.expirationDate,
        currency: syncPayload.currency,
        sender: syncPayload.sender,
        status: syncPayload.status,
        contactIdentityProfileId: syncPayload.contactIdentityProfileId,
        lineItems: syncPayload.lineItems,
        dealId: syncPayload.dealId,
        publishImmediately: true,
        persistFinanceMirror: false
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

      await persistHubSpotQuoteState({
        quotationId,
        hubspotQuoteId: createResult.hubspotQuoteId,
        hubspotQuoteStatus: createResult.hubspotQuoteStatus,
        hubspotQuoteLink: createResult.hubspotQuoteLink,
        hubspotPdfDownloadLink: createResult.hubspotPdfDownloadLink,
        hubspotQuoteLocked: createResult.hubspotQuoteLocked
      })

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

  try {
    const updateResult = await updateHubSpotQuote({
      hubspotQuoteId: quote.hubspot_quote_id,
      title: syncPayload.title,
      expirationDate: syncPayload.expirationDate,
      currency: syncPayload.currency,
      status: syncPayload.status,
      sender: syncPayload.sender,
      lineItems: syncPayload.lineItems
    })

    if (!updateResult.success) {
      throw new Error(updateResult.error || 'HubSpot quote update failed')
    }

    await persistHubSpotQuoteState({
      quotationId,
      hubspotQuoteId: quote.hubspot_quote_id,
      hubspotQuoteStatus: updateResult.quoteStatus ?? null,
      hubspotQuoteLink: updateResult.quoteLink ?? null,
      hubspotPdfDownloadLink: updateResult.pdfDownloadLink ?? null,
      hubspotQuoteLocked: updateResult.locked ?? null
    })

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
