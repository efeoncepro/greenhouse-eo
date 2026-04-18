import 'server-only'

import { randomUUID } from 'node:crypto'

import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ──

export interface Campaign {
  campaignId: string
  eoId: string
  slug: string
  spaceId: string
  displayName: string
  description: string | null
  campaignType: string
  status: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  plannedLaunchDate: string | null
  actualLaunchDate: string | null
  ownerUserId: string | null
  createdByUserId: string | null
  tags: string[]
  channels: string[]
  notes: string | null
  budgetClp: number | null
  currency: string
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface CampaignProjectLink {
  campaignProjectLinkId: string
  campaignId: string
  spaceId: string
  projectSourceSystem: string
  projectSourceId: string
  createdAt: string
}

interface CampaignRow extends Record<string, unknown> {
  campaign_id: string
  eo_id: string
  slug: string
  space_id: string
  display_name: string
  description: string | null
  campaign_type: string
  status: string
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  planned_launch_date: string | null
  actual_launch_date: string | null
  owner_user_id: string | null
  created_by_user_id: string | null
  tags: string[]
  channels: string[]
  notes: string | null
  budget_clp: string | number | null
  currency: string
  project_count?: string | number
  created_at: string
  updated_at: string
}

interface LinkRow extends Record<string, unknown> {
  campaign_project_link_id: string
  campaign_id: string
  space_id: string
  project_source_system: string
  project_source_id: string
  created_at: string
}

interface CampaignSchemaStatusRow extends Record<string, unknown> {
  spaces_regclass: string | null
  campaigns_regclass: string | null
  campaign_project_links_regclass: string | null
  campaigns_eo_id_seq_regclass: string | null
  has_budget_clp: boolean
  has_currency: boolean
}

type CampaignListOptions = {
  status?: string
  campaignIds?: string[]
  limit?: number
}

// ── Schema readiness ──

let schemaReadyPromise: Promise<void> | null = null
let schemaReadyAt = 0

const SCHEMA_READY_TTL_MS = 60_000

export const assertCampaignSchemaReady = async (): Promise<void> => {
  if (!isGreenhousePostgresConfigured()) {
    throw new Error('Campaign Postgres store is not configured in this environment.')
  }

  if (Date.now() - schemaReadyAt < SCHEMA_READY_TTL_MS) {
    return
  }

  if (schemaReadyPromise) return schemaReadyPromise

  schemaReadyPromise = (async () => {
    const rows = await runGreenhousePostgresQuery<CampaignSchemaStatusRow>(
      `SELECT
         to_regclass('greenhouse_core.spaces')::text AS spaces_regclass,
         to_regclass('greenhouse_core.campaigns')::text AS campaigns_regclass,
         to_regclass('greenhouse_core.campaign_project_links')::text AS campaign_project_links_regclass,
         to_regclass('greenhouse_core.campaigns_eo_id_seq')::text AS campaigns_eo_id_seq_regclass,
         EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'greenhouse_core'
             AND table_name = 'campaigns'
             AND column_name = 'budget_clp'
         ) AS has_budget_clp,
         EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'greenhouse_core'
             AND table_name = 'campaigns'
             AND column_name = 'currency'
         ) AS has_currency`
    )

    const status = rows[0]
    const missing: string[] = []

    if (!status?.spaces_regclass) missing.push('greenhouse_core.spaces')
    if (!status?.campaigns_regclass) missing.push('greenhouse_core.campaigns')
    if (!status?.campaign_project_links_regclass) missing.push('greenhouse_core.campaign_project_links')
    if (!status?.campaigns_eo_id_seq_regclass) missing.push('greenhouse_core.campaigns_eo_id_seq')
    if (!status?.has_budget_clp) missing.push('greenhouse_core.campaigns.budget_clp')
    if (!status?.has_currency) missing.push('greenhouse_core.campaigns.currency')

    if (missing.length > 0) {
      throw new Error(
        `Campaign PostgreSQL schema is not ready. Missing: ${missing.join(', ')}. Run pnpm setup:postgres:campaigns with migrator credentials after pnpm setup:postgres:canonical-360 if needed.`
      )
    }

    schemaReadyAt = Date.now()
  })().catch(err => {
    schemaReadyPromise = null
    throw err
  })

  return schemaReadyPromise.finally(() => {
    schemaReadyPromise = null
  })
}

// ── Mappers ──

const toDate = (v: unknown): string | null => {
  if (!v) return null
  const s = typeof v === 'string' ? v : typeof v === 'object' && v !== null && 'value' in v ? String((v as { value: unknown }).value) : String(v)

  return s.slice(0, 10)
}

const mapCampaign = (row: CampaignRow): Campaign => ({
  campaignId: row.campaign_id,
  eoId: row.eo_id,
  slug: row.slug,
  spaceId: row.space_id,
  displayName: row.display_name,
  description: row.description,
  campaignType: row.campaign_type,
  status: row.status,
  plannedStartDate: toDate(row.planned_start_date),
  plannedEndDate: toDate(row.planned_end_date),
  actualStartDate: toDate(row.actual_start_date),
  actualEndDate: toDate(row.actual_end_date),
  plannedLaunchDate: toDate(row.planned_launch_date),
  actualLaunchDate: toDate(row.actual_launch_date),
  ownerUserId: row.owner_user_id,
  createdByUserId: row.created_by_user_id,
  tags: row.tags || [],
  channels: row.channels || [],
  notes: row.notes,
  budgetClp: row.budget_clp != null ? Number(row.budget_clp) : null,
  currency: row.currency || 'CLP',
  projectCount: Number(row.project_count ?? 0),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at)
})

const mapLink = (row: LinkRow): CampaignProjectLink => ({
  campaignProjectLinkId: row.campaign_project_link_id,
  campaignId: row.campaign_id,
  spaceId: row.space_id,
  projectSourceSystem: row.project_source_system,
  projectSourceId: row.project_source_id,
  createdAt: String(row.created_at)
})

// ── Slug generator ──

const toSlug = (name: string): string =>
  name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

// ── CRUD ──

export const listCampaigns = async (
  spaceId: string,
  options?: CampaignListOptions
): Promise<Campaign[]> => {
  await assertCampaignSchemaReady()

  return listCampaignsByScope({
    spaceIds: [spaceId],
    status: options?.status,
    campaignIds: options?.campaignIds
  })
}

export const listCampaignsBySpaceIds = async (
  spaceIds: string[],
  options?: CampaignListOptions
): Promise<Campaign[]> => {
  await assertCampaignSchemaReady()

  const dedupedSpaceIds = [...new Set(spaceIds.filter(Boolean))]

  if (dedupedSpaceIds.length === 0) {
    return []
  }

  return listCampaignsByScope({
    spaceIds: dedupedSpaceIds,
    status: options?.status,
    campaignIds: options?.campaignIds,
    limit: options?.limit
  })
}

const listCampaignsByScope = async ({
  spaceIds,
  status,
  campaignIds,
  limit
}: {
  spaceIds?: string[]
  status?: string
  campaignIds?: string[]
  limit?: number
}): Promise<Campaign[]> => {
  const params: unknown[] = []
  let filters = 'WHERE TRUE'
  let idx = 1

  if (spaceIds?.length === 1) {
    filters += ` AND c.space_id = $${idx}`
    params.push(spaceIds[0])
    idx++
  } else if (spaceIds && spaceIds.length > 1) {
    filters += ` AND c.space_id = ANY($${idx})`
    params.push(spaceIds)
    idx++
  }

  if (status) {
    filters += ` AND c.status = $${idx}`
    params.push(status)
    idx++
  }

  if (campaignIds?.length) {
    filters += ` AND c.campaign_id = ANY($${idx})`
    params.push(campaignIds)
    idx++
  }

  const limitClause = limit != null ? `LIMIT $${idx}` : ''

  const rows = await runGreenhousePostgresQuery<CampaignRow>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM greenhouse_core.campaign_project_links cpl WHERE cpl.campaign_id = c.campaign_id) AS project_count
     FROM greenhouse_core.campaigns c
     ${filters}
     ORDER BY c.updated_at DESC
     ${limitClause}`,
    limit != null ? [...params, limit] : params
  )

  return rows.map(mapCampaign)
}

export const listAllCampaigns = async (
  options?: CampaignListOptions
): Promise<Campaign[]> => {
  await assertCampaignSchemaReady()

  return listCampaignsByScope({
    status: options?.status,
    campaignIds: options?.campaignIds,
    limit: options?.limit ?? 100
  })
}

export const getCampaign = async (campaignId: string): Promise<Campaign | null> => {
  await assertCampaignSchemaReady()

  const rows = await runGreenhousePostgresQuery<CampaignRow>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM greenhouse_core.campaign_project_links cpl WHERE cpl.campaign_id = c.campaign_id) AS project_count
     FROM greenhouse_core.campaigns c
     WHERE c.campaign_id = $1`,
    [campaignId]
  )

  return rows.length > 0 ? mapCampaign(rows[0]) : null
}

export const createCampaign = async (input: {
  spaceId: string
  displayName: string
  description?: string
  campaignType?: string
  status?: string
  plannedStartDate?: string
  plannedEndDate?: string
  plannedLaunchDate?: string
  ownerUserId?: string
  createdByUserId?: string
  tags?: string[]
  channels?: string[]
  notes?: string
  budgetClp?: number
  currency?: string
}): Promise<Campaign> => {
  await assertCampaignSchemaReady()

  const campaignId = randomUUID()

  const seq = await runGreenhousePostgresQuery<{ nextval: string } & Record<string, unknown>>(
    `SELECT nextval('greenhouse_core.campaigns_eo_id_seq'::regclass)::text`
  ).catch(() => [{ nextval: String(Date.now()).slice(-6) } as { nextval: string } & Record<string, unknown>])

  const eoId = `EO-CMP-${String(seq[0]?.nextval ?? Date.now()).padStart(4, '0')}`
  const slug = `${toSlug(input.displayName)}-${eoId.slice(-4).toLowerCase()}`

  const rows = await runGreenhousePostgresQuery<CampaignRow>(
    `INSERT INTO greenhouse_core.campaigns (
      campaign_id, eo_id, slug, space_id, display_name, description,
      campaign_type, status,
      planned_start_date, planned_end_date, planned_launch_date,
      owner_user_id, created_by_user_id,
      tags, channels, notes,
      budget_clp, currency,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8,
      $9::date, $10::date, $11::date,
      $12, $13,
      $14, $15, $16,
      $17, $18,
      NOW(), NOW()
    )
    RETURNING *, 0 AS project_count`,
    [
      campaignId, eoId, slug, input.spaceId, input.displayName, input.description || null,
      input.campaignType || 'campaign', input.status || 'draft',
      input.plannedStartDate || null, input.plannedEndDate || null, input.plannedLaunchDate || null,
      input.ownerUserId || null, input.createdByUserId || null,
      input.tags || [], input.channels || [], input.notes || null,
      input.budgetClp ?? null, input.currency || 'CLP'
    ]
  )

  return mapCampaign(rows[0])
}

export const updateCampaign = async (
  campaignId: string,
  input: Partial<{
    displayName: string
    description: string | null
    campaignType: string
    status: string
    plannedStartDate: string | null
    plannedEndDate: string | null
    actualStartDate: string | null
    actualEndDate: string | null
    plannedLaunchDate: string | null
    actualLaunchDate: string | null
    ownerUserId: string | null
    tags: string[]
    channels: string[]
    notes: string | null
  }>
): Promise<Campaign | null> => {
  await assertCampaignSchemaReady()

  const updates: string[] = []
  const params: unknown[] = [campaignId]
  let idx = 2

  const fieldMap: Record<string, string> = {
    displayName: 'display_name',
    description: 'description',
    campaignType: 'campaign_type',
    status: 'status',
    plannedStartDate: 'planned_start_date',
    plannedEndDate: 'planned_end_date',
    actualStartDate: 'actual_start_date',
    actualEndDate: 'actual_end_date',
    plannedLaunchDate: 'planned_launch_date',
    actualLaunchDate: 'actual_launch_date',
    ownerUserId: 'owner_user_id',
    tags: 'tags',
    channels: 'channels',
    notes: 'notes',
    budgetClp: 'budget_clp',
    currency: 'currency'
  }

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in input) {
      const val = (input as Record<string, unknown>)[key]

      if (['plannedStartDate', 'plannedEndDate', 'actualStartDate', 'actualEndDate', 'plannedLaunchDate', 'actualLaunchDate'].includes(key)) {
        updates.push(`${col} = $${idx}::date`)
      } else {
        updates.push(`${col} = $${idx}`)
      }

      params.push(val)
      idx++
    }
  }

  if (updates.length === 0) return getCampaign(campaignId)

  updates.push('updated_at = NOW()')

  const rows = await runGreenhousePostgresQuery<CampaignRow>(
    `UPDATE greenhouse_core.campaigns SET ${updates.join(', ')}
     WHERE campaign_id = $1
     RETURNING *, (SELECT COUNT(*) FROM greenhouse_core.campaign_project_links cpl WHERE cpl.campaign_id = $1) AS project_count`,
    params
  )

  return rows.length > 0 ? mapCampaign(rows[0]) : null
}

// ── Project Links ──

export const listCampaignProjects = async (campaignId: string): Promise<CampaignProjectLink[]> => {
  await assertCampaignSchemaReady()

  const rows = await runGreenhousePostgresQuery<LinkRow>(
    `SELECT * FROM greenhouse_core.campaign_project_links WHERE campaign_id = $1 ORDER BY created_at`,
    [campaignId]
  )

  return rows.map(mapLink)
}

export const addProjectToCampaign = async (input: {
  campaignId: string
  spaceId: string
  projectSourceId: string
  projectSourceSystem?: string
}): Promise<CampaignProjectLink> => {
  await assertCampaignSchemaReady()

  const linkId = randomUUID()

  const rows = await runGreenhousePostgresQuery<LinkRow>(
    `INSERT INTO greenhouse_core.campaign_project_links
       (campaign_project_link_id, campaign_id, space_id, project_source_system, project_source_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [linkId, input.campaignId, input.spaceId, input.projectSourceSystem || 'notion', input.projectSourceId]
  )

  return mapLink(rows[0])
}

export const removeProjectFromCampaign = async (campaignProjectLinkId: string): Promise<void> => {
  await assertCampaignSchemaReady()

  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_core.campaign_project_links WHERE campaign_project_link_id = $1`,
    [campaignProjectLinkId]
  )
}
