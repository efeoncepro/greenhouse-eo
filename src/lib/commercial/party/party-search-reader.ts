import 'server-only'
import { resolveOrganizationLogoUrl } from '@/lib/account-360/resolve-organization-logo'

import { query as runQuery } from '@/lib/db'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import {
  listHubSpotCandidates,
  normalizeCompanyDomain,
  type HubSpotCandidateRecord
} from './hubspot-candidate-reader'
import { parseLifecycleStage } from './lifecycle-state-machine'
import type { LifecycleStage } from './types'

interface OrganizationSearchRow extends Record<string, unknown> {
  organization_id: string
  commercial_party_id: string
  hubspot_company_id: string | null
  organization_name: string
  legal_name: string | null
  lifecycle_stage: string
  updated_at: Date | string
  website_url: string | null
  logo_asset_id: string | null
}

export interface PartySearchFilters {
  visibleOrganizationIds?: string[]
  tenant?: TenantContext
  includeStages: readonly LifecycleStage[]
  allowHubspotCandidates: boolean
  limit?: number
}

export interface PartySearchItem {
  kind: 'party' | 'hubspot_candidate'
  organizationId?: string
  commercialPartyId?: string
  hubspotCompanyId?: string
  displayName: string
  lifecycleStage?: LifecycleStage
  domain?: string | null
  logoUrl?: string | null
  lastActivityAt?: string | null
  canAdopt: boolean
}

export interface PartySearchResult {
  parties: PartySearchItem[]
  hasMore: boolean
}

const PARTY_STAGE_PRIORITY: Record<LifecycleStage, number> = {
  active_client: 0,
  opportunity: 1,
  prospect: 2,
  inactive: 3,
  provider_only: 4,
  disqualified: 5,
  churned: 6
}

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const mapOrganizationRow = (row: OrganizationSearchRow): PartySearchItem => {
  const lifecycleStage = parseLifecycleStage(row.lifecycle_stage)

  if (!lifecycleStage) {
    throw new Error(
      `Organization ${row.organization_id} has unsupported lifecycle_stage ${String(row.lifecycle_stage)}.`
    )
  }

  return {
    kind: 'party',
    organizationId: row.organization_id,
    commercialPartyId: String(row.commercial_party_id),
    hubspotCompanyId: row.hubspot_company_id ?? undefined,
    displayName: row.organization_name || row.legal_name || row.hubspot_company_id || row.organization_id,
    lifecycleStage,
    domain: normalizeCompanyDomain(row.website_url),
    logoUrl: resolveOrganizationLogoUrl(row.logo_asset_id),
    lastActivityAt: toIsoString(row.updated_at),
    canAdopt: false
  }
}

const candidateToSearchItem = (candidate: HubSpotCandidateRecord): PartySearchItem => ({
  kind: 'hubspot_candidate',
  hubspotCompanyId: candidate.hubspotCompanyId,
  displayName: candidate.displayName,
  lifecycleStage: candidate.lifecycleStage,
  domain: candidate.domain,
  lastActivityAt: candidate.lastActivityAt,
  canAdopt: true
})

const sortPartySearchItems = (left: PartySearchItem, right: PartySearchItem) => {
  if (left.kind !== right.kind) {
    return left.kind === 'party' ? -1 : 1
  }

  const leftStage = left.lifecycleStage ?? 'prospect'
  const rightStage = right.lifecycleStage ?? 'prospect'
  const stageDelta = PARTY_STAGE_PRIORITY[leftStage] - PARTY_STAGE_PRIORITY[rightStage]

  if (stageDelta !== 0) {
    return stageDelta
  }

  const leftTime = left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0
  const rightTime = right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0

  if (leftTime !== rightTime) {
    return rightTime - leftTime
  }

  return left.displayName.localeCompare(right.displayName, 'es', { sensitivity: 'base' })
}

export const mergePartySearchItems = (
  organizations: PartySearchItem[],
  candidates: PartySearchItem[]
): PartySearchItem[] => {
  const deduped = new Map<string, PartySearchItem>()

  for (const item of [...organizations, ...candidates]) {
    const key =
      item.hubspotCompanyId?.trim() ||
      item.organizationId?.trim() ||
      `${item.kind}:${item.displayName.toLowerCase()}`

    const existing = deduped.get(key)

    if (!existing || (existing.kind === 'hubspot_candidate' && item.kind === 'party')) {
      deduped.set(key, item)
    }
  }

  return Array.from(deduped.values()).sort(sortPartySearchItems)
}

const listVisibleOrganizations = async ({
  query,
  visibleOrganizationIds,
  includeStages,
  tenant,
  limit
}: {
  query: string
  visibleOrganizationIds?: string[]
  includeStages: readonly LifecycleStage[]
  tenant?: TenantContext
  limit: number
}): Promise<PartySearchItem[]> => {
  if (!tenant && (!visibleOrganizationIds || visibleOrganizationIds.length === 0)) {
    return []
  }

  const needle = `%${query.trim()}%`
  const values: unknown[] = [[...includeStages], needle]

  const conditions = [
    'o.active = TRUE',
    'o.lifecycle_stage = ANY($1::text[])',
    `(
      o.organization_name ILIKE $2
      OR COALESCE(o.legal_name, '') ILIKE $2
      OR COALESCE(o.public_id, '') ILIKE $2
      OR COALESCE(o.hubspot_company_id, '') ILIKE $2
      OR COALESCE(c.website_url, '') ILIKE $2
    )`
  ]

  if (tenant) {
    if (tenant.tenantType !== 'efeonce_internal') {
      const organizationId = tenant.organizationId?.trim()
      const clientId = tenant.clientId?.trim()

      if (organizationId) {
        values.push(organizationId)
        conditions.push(`o.organization_id = $${values.length}`)
      } else if (clientId) {
        values.push(clientId)
        conditions.push(
          `EXISTS (
             SELECT 1
             FROM greenhouse_core.spaces s
             WHERE s.active = TRUE
               AND s.client_id = $${values.length}
               AND s.organization_id = o.organization_id
           )`
        )
      } else {
        return []
      }
    }
  } else if (visibleOrganizationIds && visibleOrganizationIds.length > 0) {
    values.push(visibleOrganizationIds)
    conditions.push(`o.organization_id = ANY($${values.length}::text[])`)
  }

  values.push(Math.max(limit * 2, 20))

  const rows = await runQuery<OrganizationSearchRow>(
    `SELECT
       o.organization_id,
       o.commercial_party_id,
       o.hubspot_company_id,
       o.organization_name,
       o.legal_name,
       o.lifecycle_stage,
       o.updated_at,
       o.logo_asset_id,
       c.website_url
     FROM greenhouse_core.organizations o
     LEFT JOIN greenhouse_crm.companies c
       ON c.hubspot_company_id = o.hubspot_company_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY o.updated_at DESC
     LIMIT $${values.length}`,
    values
  )

  return rows.map(mapOrganizationRow)
}

export const searchParties = async (
  query: string,
  filters: PartySearchFilters
): Promise<PartySearchResult> => {
  const normalizedQuery = query.trim()
  const limit = Math.max(1, Math.min(filters.limit ?? 20, 50))

  if (!normalizedQuery) {
    return {
      parties: [],
      hasMore: false
    }
  }

  const [organizations, candidates] = await Promise.all([
    listVisibleOrganizations({
      query: normalizedQuery,
      visibleOrganizationIds: filters.visibleOrganizationIds,
      includeStages: filters.includeStages,
      tenant: filters.tenant,
      limit
    }),
    filters.allowHubspotCandidates
      ? listHubSpotCandidates({
          query: normalizedQuery,
          includeStages: filters.includeStages,
          limit
        }).then(items => items.map(candidateToSearchItem))
      : Promise.resolve([] as PartySearchItem[])
  ])

  const merged = mergePartySearchItems(organizations, candidates)

  return {
    parties: merged.slice(0, limit),
    hasMore: merged.length > limit
  }
}
