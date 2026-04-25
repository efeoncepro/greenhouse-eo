import 'server-only'

import { getOrganizationDetail } from '@/lib/account-360/organization-store'
import { query } from '@/lib/db'
import { getExchangeRateOnOrBefore } from '@/lib/finance/pricing/currency-converter'
import {
  getHubSpotGreenhouseCompanyDeals,
  type HubSpotGreenhouseCompanyDealProfile
} from '@/lib/integrations/hubspot-greenhouse-service'

import { loadHubSpotOwnerBindingByOwnerId } from './hubspot-owner-identity'
import {
  upsertCommercialDealFromHubSpotSource,
  type CommercialDealEntry
} from './deals-store'

export class OrganizationHubSpotDealsSyncOrganizationNotFoundError extends Error {
  constructor(organizationId: string) {
    super(`Organization ${organizationId} not found`)
    this.name = 'OrganizationHubSpotDealsSyncOrganizationNotFoundError'
  }
}

export class OrganizationHubSpotDealsSyncMissingCompanyIdError extends Error {
  constructor(organizationId: string) {
    super(`Organization ${organizationId} has no HubSpot Company ID`)
    this.name = 'OrganizationHubSpotDealsSyncMissingCompanyIdError'
  }
}

interface OrganizationCommercialScopeRow extends Record<string, unknown> {
  space_id: string | null
  client_id: string | null
}

interface HubSpotDealSourceRow extends Record<string, unknown> {
  hubspot_deal_id: string
  hubspot_pipeline_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  deal_name: string
  dealstage: string
  dealstage_label: string | null
  pipeline_name: string | null
  deal_type: string | null
  amount: number | null
  amount_clp: number | null
  currency: string | null
  exchange_rate_to_clp: number | null
  close_date: string | null
  probability_pct: number | null
  is_closed: boolean
  is_won: boolean
  is_deleted: boolean
  deal_owner_hubspot_user_id: string | null
  deal_owner_user_id: string | null
  deal_owner_email: string | null
  created_in_hubspot_at: string | null
  hubspot_last_synced_at: string | null
  source_payload: Record<string, unknown>
}

export interface SyncOrganizationHubSpotDealsResult {
  organizationId: string
  hubspotCompanyId: string
  totalDealsRead: number
  created: number
  updated: number
  skipped: number
  deals: CommercialDealEntry[]
}

const round2 = (value: number) => Math.round(value * 100) / 100

const resolveOrganizationCommercialScope = async (
  organizationId: string
): Promise<{ spaceId: string | null; clientId: string | null }> => {
  const rows = await query<OrganizationCommercialScopeRow>(
    `SELECT s.space_id,
            s.client_id
       FROM greenhouse_core.spaces AS s
      WHERE s.organization_id = $1
        AND s.active = TRUE
      ORDER BY s.created_at ASC, s.space_id ASC
      LIMIT 1`,
    [organizationId]
  )

  return {
    spaceId: rows[0]?.space_id ?? null,
    clientId: rows[0]?.client_id ?? null
  }
}

const resolveDealFx = async (deal: HubSpotGreenhouseCompanyDealProfile) => {
  const currency = deal.currency?.trim().toUpperCase() || 'CLP'
  const amount = typeof deal.amount === 'number' ? deal.amount : null

  if (amount == null) {
    return {
      amountClp: null,
      exchangeRateToClp: null,
      currency
    }
  }

  if (currency === 'CLP') {
    return {
      amountClp: amount,
      exchangeRateToClp: 1,
      currency
    }
  }

  const rate = await getExchangeRateOnOrBefore({
    fromCurrency: currency,
    toCurrency: 'CLP',
    rateDate: deal.closeDate ?? deal.lastModifiedAt ?? null
  })

  return {
    amountClp: rate && rate > 0 ? round2(amount * rate) : null,
    exchangeRateToClp: rate && rate > 0 ? rate : null,
    currency
  }
}

const buildSourcePayload = (
  hubspotCompanyId: string,
  deal: HubSpotGreenhouseCompanyDealProfile
) => ({
  sourceTable: 'hubspot_greenhouse_integration.company_deals',
  hubspotCompanyId,
  hubspotDealId: deal.hubspotDealId,
  pipelineId: deal.pipelineId,
  pipelineLabel: deal.pipelineLabel,
  stageId: deal.stageId,
  stageLabel: deal.stageLabel,
  stageDisplayOrder: deal.stageDisplayOrder,
  probabilityPct: deal.probabilityPct,
  isClosed: deal.isClosed,
  isWon: deal.isWon,
  dealType: deal.dealType,
  priority: deal.priority,
  ownerHubspotUserId: deal.ownerHubspotUserId,
  closeDate: deal.closeDate,
  createdAt: deal.createdAt,
  lastModifiedAt: deal.lastModifiedAt
})

const toSourceRow = async ({
  organizationId,
  hubspotCompanyId,
  clientId,
  spaceId,
  deal
}: {
  organizationId: string
  hubspotCompanyId: string
  clientId: string | null
  spaceId: string | null
  deal: HubSpotGreenhouseCompanyDealProfile
}): Promise<HubSpotDealSourceRow> => {
  const fx = await resolveDealFx(deal)
  const ownerBinding = await loadHubSpotOwnerBindingByOwnerId(deal.ownerHubspotUserId)

  return {
    hubspot_deal_id: deal.hubspotDealId,
    hubspot_pipeline_id: deal.pipelineId?.trim() || 'default',
    client_id: clientId,
    organization_id: organizationId,
    space_id: spaceId,
    deal_name: deal.dealName?.trim() || `HubSpot deal ${deal.hubspotDealId}`,
    dealstage: deal.stageId?.trim() || 'unknown',
    dealstage_label: deal.stageLabel?.trim() || null,
    pipeline_name: deal.pipelineLabel?.trim() || null,
    deal_type: deal.dealType?.trim() || null,
    amount: deal.amount,
    amount_clp: fx.amountClp,
    currency: fx.currency,
    exchange_rate_to_clp: fx.exchangeRateToClp,
    close_date: deal.closeDate,
    probability_pct: deal.probabilityPct,
    is_closed: Boolean(deal.isClosed),
    is_won: Boolean(deal.isWon),
    is_deleted: false,
    deal_owner_hubspot_user_id: deal.ownerHubspotUserId?.trim() || null,
    deal_owner_user_id: ownerBinding?.userId ?? null,
    deal_owner_email: ownerBinding?.email ?? null,
    created_in_hubspot_at: deal.createdAt,
    hubspot_last_synced_at: deal.lastModifiedAt ?? new Date().toISOString(),
    source_payload: buildSourcePayload(hubspotCompanyId, deal)
  }
}

export const syncOrganizationHubSpotDeals = async ({
  organizationId
}: {
  organizationId: string
}): Promise<SyncOrganizationHubSpotDealsResult> => {
  const organization = await getOrganizationDetail(organizationId)

  if (!organization) {
    throw new OrganizationHubSpotDealsSyncOrganizationNotFoundError(organizationId)
  }

  if (!organization.hubspotCompanyId) {
    throw new OrganizationHubSpotDealsSyncMissingCompanyIdError(organization.organizationId)
  }

  const [{ deals }, scope] = await Promise.all([
    getHubSpotGreenhouseCompanyDeals(organization.hubspotCompanyId),
    resolveOrganizationCommercialScope(organization.organizationId)
  ])

  let created = 0
  let updated = 0
  let skipped = 0
  const persistedDeals: CommercialDealEntry[] = []

  for (const deal of deals) {
    const sourceRow = await toSourceRow({
      organizationId: organization.organizationId,
      hubspotCompanyId: organization.hubspotCompanyId,
      clientId: scope.clientId,
      spaceId: scope.spaceId,
      deal
    })

    const result = await upsertCommercialDealFromHubSpotSource(sourceRow)

    if (result.action === 'created') created += 1
    else if (result.action === 'updated') updated += 1
    else skipped += 1

    persistedDeals.push(result.deal)
  }

  return {
    organizationId: organization.organizationId,
    hubspotCompanyId: organization.hubspotCompanyId,
    totalDealsRead: deals.length,
    created,
    updated,
    skipped,
    deals: persistedDeals
  }
}
