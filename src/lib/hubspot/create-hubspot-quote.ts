import 'server-only'

import {
  createHubSpotGreenhouseQuote,
  type HubSpotGreenhouseCreateQuoteRequest
} from '@/lib/integrations/hubspot-greenhouse-service'
import { resolveHubSpotContactByIdentityProfileId } from '@/lib/commercial/hubspot-contact-resolution'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { syncCanonicalFinanceQuote } from '@/lib/finance/quotation-canonical-store'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { publishQuoteCreated } from '@/lib/commercial/quotation-events'
import type { HubSpotQuoteSender, HubSpotQuoteWriteLineItem } from '@/lib/hubspot/hubspot-quote-sync'

// ── Types ──

export type CreateHubSpotQuoteInput = {
  quoteId: string
  organizationId: string
  title: string
  expirationDate: string
  description?: string
  currency?: string
  sender: HubSpotQuoteSender
  status?: string
  contactIdentityProfileId?: string | null
  hubspotContactId?: string | null
  lineItems: HubSpotQuoteWriteLineItem[]
  dealId?: string
  publishImmediately?: boolean
  persistFinanceMirror?: boolean
}

export type CreateHubSpotQuoteResult = {
  success: boolean
  quoteId: string
  hubspotQuoteId: string | null
  hubspotQuoteNumber: string | null
  hubspotQuoteStatus: string | null
  hubspotQuoteLink: string | null
  hubspotPdfDownloadLink: string | null
  hubspotQuoteLocked: boolean | null
  hubspotContactId: string | null
  error: string | null
}

// ── Status mapping: Greenhouse outbound → HubSpot ──

const resolveOutboundStatus = (publishImmediately: boolean): string =>
  publishImmediately ? 'APPROVAL_NOT_NEEDED' : 'DRAFT'

// ── Organization → HubSpot company resolution ──

interface OrgRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string | null
  hubspot_company_id: string | null
}

interface SpaceRow extends Record<string, unknown> {
  space_id: string
  client_id: string
}

const resolveOrganization = async (organizationId: string): Promise<OrgRow | null> => {
  const rows = await runGreenhousePostgresQuery<OrgRow>(
    `SELECT organization_id, organization_name, hubspot_company_id
     FROM greenhouse_core.organizations
     WHERE organization_id = $1`,
    [organizationId]
  )

  return rows[0] ?? null
}

const resolveSpaceForOrg = async (organizationId: string): Promise<SpaceRow | null> => {
  const rows = await runGreenhousePostgresQuery<SpaceRow>(
    `SELECT space_id, client_id
     FROM greenhouse_core.spaces
     WHERE organization_id = $1
     LIMIT 1`,
    [organizationId]
  )

  return rows[0] ?? null
}

// ── Client name resolution ──

// ── Client name resolution (canonical: clients.client_name → org.organization_name fallback) ──

const resolveClientName = async (clientId: string): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ client_name: string | null }>(
    `SELECT client_name FROM greenhouse_core.clients WHERE client_id = $1 LIMIT 1`,
    [clientId]
  )

  if (rows[0]?.client_name) return rows[0].client_name

  // Fallback: organization name
  const orgRows = await runGreenhousePostgresQuery<{ organization_name: string | null }>(
    `SELECT o.organization_name
     FROM greenhouse_core.clients c
     JOIN greenhouse_core.organizations o ON o.organization_id = c.organization_id
     WHERE c.client_id = $1 LIMIT 1`,
    [clientId]
  )

  return orgRows[0]?.organization_name ?? null
}

// ── Core creation logic ──

export const createHubSpotQuote = async (input: CreateHubSpotQuoteInput): Promise<CreateHubSpotQuoteResult> => {
  const {
    quoteId,
    organizationId,
    title,
    expirationDate,
    currency = 'CLP',
    sender,
    lineItems,
    dealId,
    publishImmediately = false,
    persistFinanceMirror = true
  } = input

  // 1. Resolve organization → hubspot_company_id
  const org = await resolveOrganization(organizationId)

  if (!org) {
    return {
      success: false,
      quoteId,
      hubspotQuoteId: null,
      hubspotQuoteNumber: null,
      hubspotQuoteStatus: null,
      hubspotQuoteLink: null,
      hubspotPdfDownloadLink: null,
      hubspotQuoteLocked: null,
      hubspotContactId: null,
      error: 'Organization not found'
    }
  }

  if (!org.hubspot_company_id) {
    return {
      success: false,
      quoteId,
      hubspotQuoteId: null,
      hubspotQuoteNumber: null,
      hubspotQuoteStatus: null,
      hubspotQuoteLink: null,
      hubspotPdfDownloadLink: null,
      hubspotQuoteLocked: null,
      hubspotContactId: null,
      error: 'Organization has no HubSpot company linked'
    }
  }

  const explicitHubSpotContactId = input.hubspotContactId?.trim() || null
  const contactIdentityProfileId = input.contactIdentityProfileId?.trim() || null
  let resolvedHubSpotContactId = explicitHubSpotContactId

  if (!resolvedHubSpotContactId && contactIdentityProfileId) {
    const contactResolution = await resolveHubSpotContactByIdentityProfileId(contactIdentityProfileId)

    if (!contactResolution?.hubspotContactId) {
      return {
        success: false,
        quoteId,
        hubspotQuoteId: null,
        hubspotQuoteNumber: null,
        hubspotQuoteStatus: null,
        hubspotQuoteLink: null,
        hubspotPdfDownloadLink: null,
        hubspotQuoteLocked: null,
        hubspotContactId: null,
        error: 'Contact has no HubSpot contact linked'
      }
    }

    resolvedHubSpotContactId = contactResolution.hubspotContactId
  }

  // 2. Resolve optional finance quote mirror context.
  const space = persistFinanceMirror ? await resolveSpaceForOrg(organizationId) : null
  const clientName = space ? await resolveClientName(space.client_id) : null

  // 3. Build Cloud Run request
  const payload: HubSpotGreenhouseCreateQuoteRequest = {
    title,
    expirationDate,
    language: 'es',
    locale: 'es-cl',
    currency,
    sender,
    status: input.status || resolveOutboundStatus(publishImmediately),
    associations: {
      companyId: org.hubspot_company_id,
      dealId: dealId || undefined,
      contactIds: resolvedHubSpotContactId ? [resolvedHubSpotContactId] : undefined
    },
    lineItems: lineItems.map(li => ({
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

  // 4. Call Cloud Run integration service
  let hubspotQuoteId: string | null = null
  let hubspotQuoteNumber: string | null = null
  let hubspotQuoteStatus: string | null = null
  let hubspotQuoteLink: string | null = null
  let hubspotPdfDownloadLink: string | null = null
  let hubspotQuoteLocked: boolean | null = null

  try {
    const response = await createHubSpotGreenhouseQuote(payload)

    hubspotQuoteId = response.hubspotQuoteId
    hubspotQuoteNumber = response.quoteNumber
    hubspotQuoteStatus = response.status ?? null
    hubspotQuoteLink = response.quoteLink ?? null
    hubspotPdfDownloadLink = response.pdfDownloadLink ?? null
    hubspotQuoteLocked = response.locked ?? null
  } catch (error) {
    return {
      success: false,
      quoteId,
      hubspotQuoteId: null,
      hubspotQuoteNumber: null,
      hubspotQuoteStatus: null,
      hubspotQuoteLink: null,
      hubspotPdfDownloadLink: null,
      hubspotQuoteLocked: null,
      hubspotContactId: resolvedHubSpotContactId,
      error: error instanceof Error ? error.message : 'HubSpot quote creation failed'
    }
  }

  if (!persistFinanceMirror) {
    return {
      success: true,
      quoteId,
      hubspotQuoteId,
      hubspotQuoteNumber,
      hubspotQuoteStatus,
      hubspotQuoteLink,
      hubspotPdfDownloadLink,
      hubspotQuoteLocked,
      hubspotContactId: resolvedHubSpotContactId,
      error: null
    }
  }

  if (!space) {
    return {
      success: true,
      quoteId,
      hubspotQuoteId,
      hubspotQuoteNumber,
      hubspotQuoteStatus,
      hubspotQuoteLink,
      hubspotPdfDownloadLink,
      hubspotQuoteLocked,
      hubspotContactId: resolvedHubSpotContactId,
      error: null
    }
  }

  // 5. Persist locally + publish outbox event in a transaction
  const totalAmount = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
  const status = input.status || resolveOutboundStatus(publishImmediately)
  const persistedQuoteId = hubspotQuoteId ? `QUO-HS-${hubspotQuoteId}` : quoteId

  await withGreenhousePostgresTransaction(async client => {
    await client.query(
      `INSERT INTO greenhouse_finance.quotes (
        quote_id, client_id, organization_id, client_name,
        quote_number, quote_date, due_date, description,
        currency, total_amount, total_amount_clp, status,
        source_system, hubspot_quote_id, hubspot_deal_id, hubspot_last_synced_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, CURRENT_DATE, $6::date, $7,
        'CLP', $8, $8, $9,
        'hubspot', $10, $11, NOW(),
        NOW(), NOW()
      )
      ON CONFLICT (quote_id) DO UPDATE SET
        client_id = EXCLUDED.client_id,
        organization_id = EXCLUDED.organization_id,
        client_name = EXCLUDED.client_name,
        quote_number = EXCLUDED.quote_number,
        due_date = EXCLUDED.due_date,
        description = EXCLUDED.description,
        total_amount = EXCLUDED.total_amount,
        total_amount_clp = EXCLUDED.total_amount_clp,
        status = EXCLUDED.status,
        source_system = EXCLUDED.source_system,
        hubspot_quote_id = EXCLUDED.hubspot_quote_id,
        hubspot_deal_id = EXCLUDED.hubspot_deal_id,
        hubspot_last_synced_at = NOW(),
        updated_at = NOW()`,
      [
        persistedQuoteId, space.client_id, organizationId, clientName,
        hubspotQuoteNumber, expirationDate, title,
        totalAmount, status,
        hubspotQuoteId, dealId || null
      ]
    )

    // Persist line items locally (TASK-211)
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i]
      const liId = `GH-LI-OUT-${Date.now()}-${i}`

      await client.query(
        `INSERT INTO greenhouse_finance.quote_line_items (
          line_item_id, quote_id, source_system,
          line_number, name, description,
          quantity, unit_price, total_amount,
          created_at, updated_at
        ) VALUES ($1, $2, 'hubspot', $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          liId, persistedQuoteId, i + 1,
          li.name, li.description || null,
          li.quantity, li.unitPrice, li.quantity * li.unitPrice
        ]
      )
    }

    await syncCanonicalFinanceQuote({ quoteId: persistedQuoteId, client })

    const identity = await resolveQuotationIdentity(persistedQuoteId).catch(() => null)

    await publishQuoteCreated(
      {
        quoteId: persistedQuoteId,
        quotationId: identity?.quotationId ?? null,
        hubspotQuoteId,
        hubspotDealId: dealId || null,
        sourceSystem: 'hubspot',
        direction: 'outbound',
        organizationId,
        spaceId: space.space_id,
        amount: totalAmount,
        currency: 'CLP',
        lineItemCount: lineItems.length
      },
      client
    )
  })

  return {
    success: true,
    quoteId: persistedQuoteId,
    hubspotQuoteId,
    hubspotQuoteNumber,
    hubspotQuoteStatus,
    hubspotQuoteLink,
    hubspotPdfDownloadLink,
    hubspotQuoteLocked,
    hubspotContactId: resolvedHubSpotContactId,
    error: null
  }
}
