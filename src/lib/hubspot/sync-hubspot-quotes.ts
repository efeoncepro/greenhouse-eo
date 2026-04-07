import 'server-only'

import {
  getHubSpotGreenhouseCompanyQuotes,
  type HubSpotGreenhouseQuoteProfile
} from '@/lib/integrations/hubspot-greenhouse-service'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { syncQuoteLineItems } from '@/lib/hubspot/sync-hubspot-line-items'

// ── Status mapping: HubSpot → Greenhouse ──

const HUBSPOT_STATUS_MAP: Record<string, string> = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'sent',
  APPROVAL_NOT_NEEDED: 'sent',
  APPROVED: 'accepted',
  REJECTED: 'rejected',
  SIGNED: 'accepted',
  LOST: 'rejected',
  EXPIRED: 'expired'
}

const mapHubSpotStatus = (hsStatus: string | null): string =>
  (hsStatus && HUBSPOT_STATUS_MAP[hsStatus]) || 'draft'

// ── Space resolution (same pattern as service-sync.ts) ──

interface SpaceRow extends Record<string, unknown> {
  space_id: string
  client_id: string
  organization_id: string | null
}

const resolveSpaceForCompany = async (hubspotCompanyId: string): Promise<SpaceRow | null> => {
  const rows = await runGreenhousePostgresQuery<SpaceRow>(
    `SELECT s.space_id, s.client_id, s.organization_id
     FROM greenhouse_core.spaces s
     JOIN greenhouse_core.organizations o ON o.organization_id = s.organization_id
     WHERE o.hubspot_company_id = $1
     LIMIT 1`,
    [hubspotCompanyId]
  )

  return rows[0] ?? null
}

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

// ── Upsert single quote ──

const upsertQuoteFromHubSpot = async (
  quote: HubSpotGreenhouseQuoteProfile,
  space: SpaceRow,
  clientName: string | null
): Promise<'created' | 'updated' | 'skipped'> => {
  const hubspotQuoteId = quote.identity.hubspotQuoteId

  if (!hubspotQuoteId) return 'skipped'

  const quoteId = `QUO-HS-${hubspotQuoteId}`
  const title = quote.identity.title || `HubSpot Quote ${hubspotQuoteId}`
  const quoteNumber = quote.identity.quoteNumber || null
  const amount = quote.financial.amount ?? 0
  const currency = quote.financial.currency || 'CLP'
  const status = mapHubSpotStatus(quote.status.approvalStatus)
  const expirationDate = quote.dates.expirationDate || null
  const createDate = quote.dates.createDate || null
  const dealId = quote.associations.dealId || null

  const result = await runGreenhousePostgresQuery<{ action: string }>(
    `INSERT INTO greenhouse_finance.quotes (
      quote_id, client_id, organization_id, client_name,
      quote_number, quote_date, due_date, description,
      currency, total_amount, total_amount_clp, status,
      source_system, hubspot_quote_id, hubspot_deal_id, hubspot_last_synced_at,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6::date, $7::date, $8,
      $9, $10, $11, $12,
      'hubspot', $13, $14, NOW(),
      NOW(), NOW()
    )
    ON CONFLICT (quote_id) DO UPDATE SET
      client_name = EXCLUDED.client_name,
      quote_number = EXCLUDED.quote_number,
      total_amount = EXCLUDED.total_amount,
      total_amount_clp = EXCLUDED.total_amount_clp,
      currency = EXCLUDED.currency,
      status = EXCLUDED.status,
      hubspot_deal_id = EXCLUDED.hubspot_deal_id,
      hubspot_last_synced_at = NOW(),
      updated_at = NOW()
    RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action`,
    [
      quoteId, space.client_id, space.organization_id, clientName,
      quoteNumber, createDate, expirationDate, title,
      currency, amount, currency === 'CLP' ? amount : 0, status,
      hubspotQuoteId, dealId
    ]
  )

  const action = (result[0]?.action ?? 'skipped') as 'created' | 'updated' | 'skipped'

  if (action === 'created' || action === 'updated') {
    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.quote,
      aggregateId: quoteId,
      eventType: EVENT_TYPES.quoteSynced,
      payload: {
        quoteId,
        hubspotQuoteId,
        hubspotDealId: dealId,
        sourceSystem: 'hubspot',
        action,
        organizationId: space.organization_id,
        spaceId: space.space_id
      }
    })
  }

  return action
}

// ── Public API ──

export interface QuoteSyncResult {
  hubspotCompanyId: string
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export const syncHubSpotQuotesForCompany = async (hubspotCompanyId: string): Promise<QuoteSyncResult> => {
  const result: QuoteSyncResult = { hubspotCompanyId, created: 0, updated: 0, skipped: 0, errors: [] }

  const space = await resolveSpaceForCompany(hubspotCompanyId)

  if (!space) {
    result.errors.push(`No space found for HubSpot company ${hubspotCompanyId}`)

    return result
  }

  const clientName = await resolveClientName(space.client_id)

  let quotes: HubSpotGreenhouseQuoteProfile[]

  try {
    const response = await getHubSpotGreenhouseCompanyQuotes(hubspotCompanyId)

    quotes = response.quotes
  } catch (err) {
    result.errors.push(`HubSpot API error: ${err instanceof Error ? err.message : String(err)}`)

    return result
  }

  for (const quote of quotes) {
    try {
      const action = await upsertQuoteFromHubSpot(quote, space, clientName)

      if (action === 'created') result.created++
      else if (action === 'updated') result.updated++
      else result.skipped++

      // Sync line items for this quote (TASK-211)
      if (action === 'created' || action === 'updated') {
        const quoteId = `QUO-HS-${quote.identity.hubspotQuoteId}`

        try {
          await syncQuoteLineItems(quoteId, quote.identity.hubspotQuoteId)
        } catch (liErr) {
          result.errors.push(`Quote ${quoteId} line items: ${liErr instanceof Error ? liErr.message : String(liErr)}`)
        }
      }
    } catch (err) {
      result.errors.push(`Quote ${quote.identity.quoteId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

export const syncAllHubSpotQuotes = async (): Promise<{
  organizations: number
  results: QuoteSyncResult[]
}> => {
  const orgs = await runGreenhousePostgresQuery<{ hubspot_company_id: string }>(
    `SELECT DISTINCT hubspot_company_id
     FROM greenhouse_core.organizations
     WHERE hubspot_company_id IS NOT NULL AND hubspot_company_id != ''`
  )

  const results: QuoteSyncResult[] = []

  for (const org of orgs) {
    const result = await syncHubSpotQuotesForCompany(org.hubspot_company_id)

    results.push(result)
  }

  return { organizations: orgs.length, results }
}
