import {
  listHubSpotDealSyncSourceRows,
  upsertCommercialDealFromHubSpotSource,
  type CommercialDealEntry
} from '@/lib/commercial/deals-store'

export interface HubSpotDealsSyncOptions {
  includeClosed?: boolean
  hubspotDealIds?: string[]
}

export interface HubSpotDealsSyncRowResult {
  hubspotDealId: string
  action: 'created' | 'updated' | 'skipped'
  deal: CommercialDealEntry | null
  changedFields: string[]
  error?: string
}

export interface HubSpotDealsSyncSummary {
  totalSourceDeals: number
  created: number
  updated: number
  skipped: number
  errors: string[]
  results: HubSpotDealsSyncRowResult[]
}

export const syncHubSpotDeals = async (
  options: HubSpotDealsSyncOptions = {}
): Promise<HubSpotDealsSyncSummary> => {
  const sourceRows = await listHubSpotDealSyncSourceRows({
    includeClosed: options.includeClosed ?? true,
    hubspotDealIds: options.hubspotDealIds ?? []
  })

  const summary: HubSpotDealsSyncSummary = {
    totalSourceDeals: sourceRows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    results: []
  }

  for (const sourceRow of sourceRows) {
    try {
      const result = await upsertCommercialDealFromHubSpotSource(sourceRow)

      if (result.action === 'created') summary.created += 1
      else if (result.action === 'updated') summary.updated += 1
      else summary.skipped += 1

      summary.results.push({
        hubspotDealId: sourceRow.hubspot_deal_id,
        action: result.action,
        deal: result.deal,
        changedFields: result.changedFields
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      summary.errors.push(`${sourceRow.hubspot_deal_id}: ${message}`)
      summary.results.push({
        hubspotDealId: sourceRow.hubspot_deal_id,
        action: 'skipped',
        deal: null,
        changedFields: [],
        error: message
      })
    }
  }

  return summary
}

export const syncSingleHubSpotDeal = async (
  hubspotDealId: string
): Promise<HubSpotDealsSyncSummary> =>
  syncHubSpotDeals({
    includeClosed: true,
    hubspotDealIds: [hubspotDealId]
  })
