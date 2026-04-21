import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'

import { parseLifecycleStage } from './lifecycle-state-machine'
import { resolveHubSpotStage } from './hubspot-lifecycle-mapping'
import type { LifecycleStage } from './types'

interface HubSpotCandidateRow {
  hubspot_company_id: string
  company_name: string
  legal_name: string | null
  lifecycle_stage: string | null
  website_url: string | null
  source_updated_at: Date | string | null
  synced_at: Date | string
  updated_at: Date | string
}

export interface HubSpotCandidateRecord {
  hubspotCompanyId: string
  displayName: string
  lifecycleStage: LifecycleStage
  hubspotLifecycleStage: string | null
  domain: string | null
  lastActivityAt: string | null
}

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const normalizeCompanyDomain = (websiteUrl: string | null | undefined): string | null => {
  if (!websiteUrl) return null

  const trimmed = websiteUrl.trim()

  if (!trimmed) return null

  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(withProtocol)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')

    return hostname || null
  } catch {
    const normalized = trimmed
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim()

    return normalized || null
  }
}

const mapCandidateRow = (row: HubSpotCandidateRow): HubSpotCandidateRecord => ({
  hubspotCompanyId: row.hubspot_company_id,
  displayName: row.legal_name?.trim() || row.company_name,
  lifecycleStage: resolveHubSpotStage(row.lifecycle_stage, { unknownFallback: 'prospect' }),
  hubspotLifecycleStage: row.lifecycle_stage,
  domain: normalizeCompanyDomain(row.website_url),
  lastActivityAt:
    toIsoString(row.source_updated_at) ??
    toIsoString(row.synced_at) ??
    toIsoString(row.updated_at)
})

export const listHubSpotCandidates = async ({
  query,
  includeStages,
  limit = 20
}: {
  query: string
  includeStages: readonly LifecycleStage[]
  limit?: number
}): Promise<HubSpotCandidateRecord[]> => {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return []
  }

  const needle = `%${normalizedQuery}%`

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_crm.companies as c')
    .leftJoin('greenhouse_core.organizations as o', 'o.hubspot_company_id', 'c.hubspot_company_id')
    .select([
      'c.hubspot_company_id',
      'c.company_name',
      'c.legal_name',
      'c.lifecycle_stage',
      'c.website_url',
      'c.source_updated_at',
      'c.synced_at',
      'c.updated_at'
    ])
    .where('c.active', '=', true)
    .where('c.is_deleted', '=', false)
    .where('c.hubspot_company_id', 'is not', null)
    .where('o.organization_id', 'is', null)
    .where(
      sql<boolean>`(
        c.company_name ILIKE ${needle}
        OR COALESCE(c.legal_name, '') ILIKE ${needle}
        OR COALESCE(c.website_url, '') ILIKE ${needle}
        OR c.hubspot_company_id ILIKE ${needle}
      )`
    )
    .orderBy(sql`COALESCE(c.source_updated_at, c.synced_at, c.updated_at) DESC`)
    .orderBy('c.company_name', 'asc')
    .limit(Math.max(limit * 3, 30))
    .execute()

  return rows
    .map(mapCandidateRow)
    .filter(candidate => includeStages.includes(candidate.lifecycleStage))
    .slice(0, limit)
}

export const getHubSpotCandidateByCompanyId = async (
  hubspotCompanyId: string
): Promise<HubSpotCandidateRecord | null> => {
  const normalizedId = hubspotCompanyId.trim()

  if (!normalizedId) {
    return null
  }

  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_crm.companies')
    .select([
      'hubspot_company_id',
      'company_name',
      'legal_name',
      'lifecycle_stage',
      'website_url',
      'source_updated_at',
      'synced_at',
      'updated_at'
    ])
    .where('hubspot_company_id', '=', normalizedId)
    .where('active', '=', true)
    .where('is_deleted', '=', false)
    .executeTakeFirst()

  return row ? mapCandidateRow(row) : null
}

export const findMaterializedPartyByHubSpotCompanyId = async (
  hubspotCompanyId: string
): Promise<{
  organizationId: string
  commercialPartyId: string
  lifecycleStage: LifecycleStage
} | null> => {
  const normalizedId = hubspotCompanyId.trim()

  if (!normalizedId) {
    return null
  }

  const db = await getDb()

  const row = await db
    .selectFrom('greenhouse_core.organizations')
    .select([
      'organization_id',
      'commercial_party_id',
      'lifecycle_stage'
    ])
    .where('hubspot_company_id', '=', normalizedId)
    .where('active', '=', true)
    .executeTakeFirst()

  if (!row) {
    return null
  }

  const lifecycleStage = parseLifecycleStage(row.lifecycle_stage)

  if (!lifecycleStage) {
    throw new Error(
      `Organization ${row.organization_id} has unsupported lifecycle_stage ${String(row.lifecycle_stage)}.`
    )
  }

  return {
    organizationId: row.organization_id,
    commercialPartyId: String(row.commercial_party_id),
    lifecycleStage
  }
}

export const findClientIdForOrganization = async (
  organizationId: string
): Promise<string | null> => {
  const normalizedId = organizationId.trim()

  if (!normalizedId) {
    return null
  }

  const db = await getDb()

  const profileRow = await db
    .selectFrom('greenhouse_finance.client_profiles')
    .select(['client_id'])
    .where('organization_id', '=', normalizedId)
    .where('client_id', 'is not', null)
    .executeTakeFirst()

  if (profileRow?.client_id) {
    return profileRow.client_id
  }

  const fallbackRow = await db
    .selectFrom('greenhouse_core.organizations as o')
    .innerJoin('greenhouse_core.clients as c', 'c.hubspot_company_id', 'o.hubspot_company_id')
    .select(['c.client_id'])
    .where('o.organization_id', '=', normalizedId)
    .where('o.hubspot_company_id', 'is not', null)
    .executeTakeFirst()

  return fallbackRow?.client_id ?? null
}
