import 'server-only'

import { query } from '@/lib/db'
import {
  getPartyLifecycleDetail,
  getPartyLifecycleFunnelMetrics,
  listPartyLifecycleSnapshots,
  listPartySyncConflicts
} from '@/lib/commercial/party'
import { normalizeCompanyDomain } from '@/lib/commercial/party/hubspot-candidate-reader'
import { parseLifecycleStage } from '@/lib/commercial/party/lifecycle-state-machine'
import { resolveHubSpotStage } from '@/lib/commercial/party/hubspot-lifecycle-mapping'

import {
  buildEmptyStageTotals,
  type CommercialPartyConflictItem,
  type CommercialPartyDashboardData,
  type CommercialPartyDetailData,
  type CommercialPartyHistoryItem,
  type CommercialPartyListItem,
  type CommercialPartyStage,
  type CommercialPartyStageTotals
} from './types'

type PartyEnrichmentRow = {
  organization_id: string
  public_id: string | null
  legal_name: string | null
  updated_at: Date | string
  hubspot_company_id: string | null
  industry: string | null
  hubspot_lifecycle_stage: string | null
  website_url: string | null
  source_updated_at: Date | string | null
  client_id: string | null
}

type CandidateCountRow = {
  lifecycle_stage: string | null
  total: number | string
}

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const maxIsoDate = (...values: Array<string | null>) => {
  const timestamps = values
    .map(value => (value ? Date.parse(value) : Number.NaN))
    .filter(value => Number.isFinite(value))

  if (timestamps.length === 0) {
    return new Date(0).toISOString()
  }

  return new Date(Math.max(...timestamps)).toISOString()
}

const requireStage = (value: string | null, context: string): CommercialPartyStage => {
  const stage = parseLifecycleStage(value)

  if (!stage) {
    throw new Error(`${context} has unsupported lifecycle stage ${String(value)}.`)
  }

  return stage
}

const summarizeCandidateBacklog = (rows: CandidateCountRow[]): CommercialPartyStageTotals => {
  const totals = buildEmptyStageTotals()

  for (const row of rows) {
    const stage = resolveHubSpotStage(row.lifecycle_stage, { unknownFallback: 'prospect' })

    totals[stage] += toNumber(row.total)
  }

  return totals
}

const loadCandidateBacklog = async () => {
  const rows = await query<CandidateCountRow>(
    `
      SELECT
        c.lifecycle_stage,
        COUNT(*) AS total
      FROM greenhouse_crm.companies c
      LEFT JOIN greenhouse_core.organizations o
        ON o.hubspot_company_id = c.hubspot_company_id
        AND o.active = TRUE
      WHERE c.active = TRUE
        AND c.is_deleted = FALSE
        AND c.hubspot_company_id IS NOT NULL
        AND o.organization_id IS NULL
      GROUP BY c.lifecycle_stage
    `
  )

  const byStage = summarizeCandidateBacklog(rows)

  return {
    total: Object.values(byStage).reduce((sum, value) => sum + value, 0),
    byStage
  }
}

const loadPartyEnrichments = async (organizationIds: string[]) => {
  if (organizationIds.length === 0) {
    return new Map<string, PartyEnrichmentRow>()
  }

  const rows = await query<PartyEnrichmentRow>(
    `
      WITH client_link AS (
        SELECT
          organization_id,
          MAX(client_id) AS client_id
        FROM greenhouse_finance.client_profiles
        WHERE organization_id = ANY($1::text[])
        GROUP BY organization_id
      )
      SELECT
        o.organization_id,
        o.public_id,
        o.legal_name,
        o.updated_at,
        o.hubspot_company_id,
        o.industry,
        c.lifecycle_stage AS hubspot_lifecycle_stage,
        c.website_url,
        c.source_updated_at,
        cl.client_id
      FROM greenhouse_core.organizations o
      LEFT JOIN greenhouse_crm.companies c
        ON c.hubspot_company_id = o.hubspot_company_id
        AND c.active = TRUE
        AND c.is_deleted = FALSE
      LEFT JOIN client_link cl
        ON cl.organization_id = o.organization_id
      WHERE o.organization_id = ANY($1::text[])
    `,
    [organizationIds]
  )

  return new Map(rows.map(row => [row.organization_id, row]))
}

const mapConflictItem = ({
  conflictId,
  organizationId,
  commercialPartyId,
  hubspotCompanyId,
  organizationName,
  lifecycleStage,
  conflictType,
  detectedAt,
  resolutionStatus,
  resolutionAppliedAt,
  resolvedBy,
  conflictingFields,
  metadata
}: {
  conflictId: string
  organizationId: string | null
  commercialPartyId: string | null
  hubspotCompanyId: string | null
  organizationName: string | null
  lifecycleStage: string | null
  conflictType: CommercialPartyConflictItem['conflictType']
  detectedAt: string
  resolutionStatus: CommercialPartyConflictItem['resolutionStatus']
  resolutionAppliedAt: string | null
  resolvedBy: string | null
  conflictingFields: Record<string, unknown> | null
  metadata: Record<string, unknown>
}): CommercialPartyConflictItem => ({
  conflictId,
  organizationId,
  commercialPartyId,
  hubspotCompanyId,
  displayName: organizationName?.trim() || hubspotCompanyId || commercialPartyId || conflictId,
  lifecycleStage: lifecycleStage ? requireStage(lifecycleStage, `Conflict ${conflictId}`) : null,
  conflictType,
  detectedAt,
  resolutionStatus,
  resolutionAppliedAt,
  resolvedBy,
  conflictingFields,
  metadata
})

const mapPartyItem = ({
  snapshot,
  enrichment,
  displayName
}: {
  snapshot: {
    organizationId: string
    commercialPartyId: string
    organizationName: string
    lifecycleStage: CommercialPartyStage
    lifecycleStageSince: string
    lifecycleStageSource: string
    latestTransitionAt: string
    unresolvedConflictsCount: number
    lastConflictAt: string | null
    lastQuoteAt: string | null
    activeQuotesCount: number
    lastContractAt: string | null
    activeContractsCount: number
  }
  enrichment?: PartyEnrichmentRow
  displayName?: string
}): CommercialPartyListItem => {
  const updatedAt = toIsoString(enrichment?.updated_at) ?? snapshot.latestTransitionAt
  const hubspotLastActivityAt = toIsoString(enrichment?.source_updated_at)
  const lastQuoteAt = snapshot.lastQuoteAt
  const lastContractAt = snapshot.lastContractAt
  const lastConflictAt = snapshot.lastConflictAt

  return {
    organizationId: snapshot.organizationId,
    commercialPartyId: snapshot.commercialPartyId,
    publicId: enrichment?.public_id ?? null,
    displayName: displayName ?? enrichment?.legal_name?.trim() ?? snapshot.organizationName,
    legalName: enrichment?.legal_name ?? null,
    lifecycleStage: snapshot.lifecycleStage,
    lifecycleStageSince: snapshot.lifecycleStageSince,
    lifecycleStageSource: snapshot.lifecycleStageSource ?? null,
    updatedAt,
    lastActivityAt: maxIsoDate(updatedAt, hubspotLastActivityAt, lastQuoteAt, lastContractAt, lastConflictAt),
    hubspotCompanyId: enrichment?.hubspot_company_id ?? null,
    hubspotLifecycleStage: enrichment?.hubspot_lifecycle_stage ?? null,
    hubspotLastActivityAt,
    domain: normalizeCompanyDomain(enrichment?.website_url ?? null),
    industry: enrichment?.industry ?? null,
    clientId: enrichment?.client_id ?? null,
    pendingConflictCount: snapshot.unresolvedConflictsCount,
    lastConflictAt,
    activeQuotes: snapshot.activeQuotesCount,
    lastQuoteAt,
    activeContracts: snapshot.activeContractsCount,
    lastContractAt
  }
}

const loadAllPartySnapshots = async () => {
  const pageSize = 200
  let offset = 0
  let total = 0
  const items: Awaited<ReturnType<typeof listPartyLifecycleSnapshots>>['items'] = []

  do {
    const page = await listPartyLifecycleSnapshots({ limit: pageSize, offset })

    total = page.total
    items.push(...page.items)
    offset += page.items.length

    if (page.items.length === 0) {
      break
    }
  } while (offset < total)

  return items
}

export const getCommercialPartiesDashboardData = async (): Promise<CommercialPartyDashboardData> => {
  const [snapshots, funnelMetrics, conflictsResult, candidateBacklog] = await Promise.all([
    loadAllPartySnapshots(),
    getPartyLifecycleFunnelMetrics(),
    listPartySyncConflicts({ unresolvedOnly: false, limit: 8 }),
    loadCandidateBacklog()
  ])

  const enrichments = await loadPartyEnrichments(snapshots.map(item => item.organizationId))

  return {
    generatedAt: funnelMetrics.generatedAt,
    parties: snapshots.map(snapshot =>
      mapPartyItem({
        snapshot,
        enrichment: enrichments.get(snapshot.organizationId)
      })
    ),
    recentConflicts: conflictsResult.items.map(item =>
      mapConflictItem({
        conflictId: item.conflictId,
        organizationId: item.organizationId,
        commercialPartyId: item.commercialPartyId,
        hubspotCompanyId: item.hubspotCompanyId,
        organizationName: item.organizationName,
        lifecycleStage: item.lifecycleStage,
        conflictType: item.conflictType as CommercialPartyConflictItem['conflictType'],
        detectedAt: item.detectedAt,
        resolutionStatus: item.resolutionStatus as CommercialPartyConflictItem['resolutionStatus'],
        resolutionAppliedAt: item.resolutionAppliedAt,
        resolvedBy: item.resolvedBy,
        conflictingFields: item.conflictingFields,
        metadata: item.metadata
      })
    ),
    stageTotals: {
      prospect: funnelMetrics.stageCounts.prospect,
      opportunity: funnelMetrics.stageCounts.opportunity,
      active_client: funnelMetrics.stageCounts.active_client,
      inactive: funnelMetrics.stageCounts.inactive,
      provider_only: funnelMetrics.stageCounts.provider_only,
      disqualified: funnelMetrics.stageCounts.disqualified,
      churned: funnelMetrics.stageCounts.churned
    },
    totalPendingConflicts: funnelMetrics.unresolvedConflictsTotal,
    conflictedPartyCount: snapshots.filter(item => item.unresolvedConflictsCount > 0).length,
    linkedClientCount: Array.from(enrichments.values()).filter(item => Boolean(item.client_id)).length,
    candidateBacklogTotal: candidateBacklog.total,
    candidateBacklogByStage: candidateBacklog.byStage
  }
}

export const getCommercialPartyDetailData = async (
  organizationId: string
): Promise<CommercialPartyDetailData | null> => {
  const detail = await getPartyLifecycleDetail(organizationId)

  if (!detail) {
    return null
  }

  const enrichment = (
    await loadPartyEnrichments([detail.snapshot.organizationId])
  ).get(detail.snapshot.organizationId)

  const party = mapPartyItem({
    snapshot: detail.snapshot,
    enrichment
  })

  return {
    party,
    history: detail.history.map(
      (item): CommercialPartyHistoryItem => ({
        historyId: item.historyId,
        fromStage: item.fromStage,
        toStage: item.toStage,
        transitionSource: item.transitionSource,
        transitionedAt: item.transitionedAt,
        transitionedBy: item.transitionedBy,
        triggerEntityType: item.triggerEntityType,
        triggerEntityId: item.triggerEntityId,
        metadata: item.metadata
      })
    ),
    conflicts: detail.conflicts.map(item =>
      mapConflictItem({
        conflictId: item.conflictId,
        organizationId: item.organizationId,
        commercialPartyId: item.commercialPartyId,
        hubspotCompanyId: item.hubspotCompanyId,
        organizationName: party.displayName,
        lifecycleStage: party.lifecycleStage,
        conflictType: item.conflictType as CommercialPartyConflictItem['conflictType'],
        detectedAt: item.detectedAt,
        resolutionStatus: item.resolutionStatus as CommercialPartyConflictItem['resolutionStatus'],
        resolutionAppliedAt: item.resolutionAppliedAt,
        resolvedBy: item.resolvedBy,
        conflictingFields: item.conflictingFields,
        metadata: item.metadata
      })
    )
  }
}
