import 'server-only'

import {
  createHubSpotGreenhouseQuote,
  type HubSpotGreenhouseCreateQuoteRequest
} from '@/lib/integrations/hubspot-greenhouse-service'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

// ── Types ──

export type CreateHubSpotQuoteInput = {
  quoteId: string
  organizationId: string
  title: string
  expirationDate: string
  description?: string
  lineItems: Array<{
    name: string
    quantity: number
    unitPrice: number
    description?: string
  }>
  dealId?: string
  publishImmediately?: boolean
}

export type CreateHubSpotQuoteResult = {
  success: boolean
  quoteId: string
  hubspotQuoteId: string | null
  hubspotQuoteNumber: string | null
  hubspotQuoteLink: string | null
  error: string | null
}

// ── Status mapping: Greenhouse outbound → HubSpot ──

const resolveOutboundStatus = (publishImmediately: boolean): string =>
  publishImmediately ? 'sent' : 'draft'

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

const resolveClientName = async (clientId: string): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ client_name: string | null }>(
    `SELECT client_name FROM greenhouse_finance.client_profiles WHERE client_profile_id = $1 LIMIT 1`,
    [clientId]
  )

  return rows[0]?.client_name ?? null
}

// ── Core creation logic ──

export const createHubSpotQuote = async (input: CreateHubSpotQuoteInput): Promise<CreateHubSpotQuoteResult> => {
  const { quoteId, organizationId, title, expirationDate, lineItems, dealId, publishImmediately = false } = input

  // 1. Resolve organization → hubspot_company_id
  const org = await resolveOrganization(organizationId)

  if (!org) {
    return { success: false, quoteId, hubspotQuoteId: null, hubspotQuoteNumber: null, hubspotQuoteLink: null, error: 'Organization not found' }
  }

  if (!org.hubspot_company_id) {
    return { success: false, quoteId, hubspotQuoteId: null, hubspotQuoteNumber: null, hubspotQuoteLink: null, error: 'Organization has no HubSpot company linked' }
  }

  // 2. Resolve space + client for local persistence
  const space = await resolveSpaceForOrg(organizationId)

  if (!space) {
    return { success: false, quoteId, hubspotQuoteId: null, hubspotQuoteNumber: null, hubspotQuoteLink: null, error: 'No space found for organization' }
  }

  const clientName = await resolveClientName(space.client_id)

  // 3. Build Cloud Run request
  const payload: HubSpotGreenhouseCreateQuoteRequest = {
    title,
    expirationDate,
    language: 'es',
    locale: 'es-cl',
    associations: {
      companyId: org.hubspot_company_id,
      dealId: dealId || undefined
    },
    lineItems: lineItems.map(li => ({
      name: li.name,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      description: li.description
    }))
  }

  // 4. Call Cloud Run integration service
  let hubspotQuoteId: string | null = null
  let hubspotQuoteNumber: string | null = null
  let hubspotQuoteLink: string | null = null

  try {
    const response = await createHubSpotGreenhouseQuote(payload)

    hubspotQuoteId = response.hubspotQuoteId
    hubspotQuoteNumber = response.quoteNumber
    hubspotQuoteLink = response.quoteLink
  } catch (error) {
    return {
      success: false,
      quoteId,
      hubspotQuoteId: null,
      hubspotQuoteNumber: null,
      hubspotQuoteLink: null,
      error: error instanceof Error ? error.message : 'HubSpot quote creation failed'
    }
  }

  // 5. Persist locally + publish outbox event in a transaction
  const totalAmount = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
  const status = resolveOutboundStatus(publishImmediately)

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
      )`,
      [
        quoteId, space.client_id, organizationId, clientName,
        hubspotQuoteNumber, expirationDate, title,
        totalAmount, status,
        hubspotQuoteId, dealId || null
      ]
    )

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.quote,
      aggregateId: quoteId,
      eventType: EVENT_TYPES.quoteCreated,
      payload: {
        quoteId,
        hubspotQuoteId,
        hubspotDealId: dealId || null,
        sourceSystem: 'hubspot',
        direction: 'outbound',
        organizationId,
        spaceId: space.space_id,
        amount: totalAmount,
        currency: 'CLP'
      }
    }, client)
  })

  return {
    success: true,
    quoteId,
    hubspotQuoteId,
    hubspotQuoteNumber,
    hubspotQuoteLink,
    error: null
  }
}
