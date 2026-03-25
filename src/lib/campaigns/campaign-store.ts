import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

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

// ── Schema provisioning ──

let ensurePromise: Promise<void> | null = null

export const ensureCampaignSchema = async (): Promise<void> => {
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    await runGreenhousePostgresQuery(`
      CREATE TABLE IF NOT EXISTS greenhouse_core.campaigns (
        campaign_id TEXT PRIMARY KEY,
        eo_id TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),
        display_name TEXT NOT NULL,
        description TEXT,
        campaign_type TEXT NOT NULL DEFAULT 'campaign',
        status TEXT NOT NULL DEFAULT 'draft',
        planned_start_date DATE,
        planned_end_date DATE,
        actual_start_date DATE,
        actual_end_date DATE,
        planned_launch_date DATE,
        actual_launch_date DATE,
        owner_user_id TEXT,
        created_by_user_id TEXT,
        tags TEXT[] NOT NULL DEFAULT '{}',
        channels TEXT[] NOT NULL DEFAULT '{}',
        notes TEXT,
        budget_clp NUMERIC(14,2),
        currency TEXT NOT NULL DEFAULT 'CLP',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    // Add budget columns if table existed before this change
    await runGreenhousePostgresQuery(`
      ALTER TABLE greenhouse_core.campaigns ADD COLUMN IF NOT EXISTS budget_clp NUMERIC(14,2)
    `).catch(() => {})
    await runGreenhousePostgresQuery(`
      ALTER TABLE greenhouse_core.campaigns ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CLP'
    `).catch(() => {})
    await runGreenhousePostgresQuery(`
      CREATE TABLE IF NOT EXISTS greenhouse_core.campaign_project_links (
        campaign_project_link_id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES greenhouse_core.campaigns(campaign_id),
        space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),
        project_source_system TEXT NOT NULL DEFAULT 'notion',
        project_source_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_campaign_project_space UNIQUE (space_id, project_source_id)
      )
    `)
  })().catch(err => {
    ensurePromise = null
    throw err
  })

  return ensurePromise
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
  options?: { status?: string; campaignIds?: string[] }
): Promise<Campaign[]> => {
  await ensureCampaignSchema()

  const params: unknown[] = [spaceId]
  let filters = 'WHERE c.space_id = $1'
  let idx = 2

  if (options?.status) {
    filters += ` AND c.status = $${idx}`
    params.push(options.status)
    idx++
  }

  if (options?.campaignIds?.length) {
    filters += ` AND c.campaign_id = ANY($${idx})`
    params.push(options.campaignIds)
    idx++
  }

  const rows = await runGreenhousePostgresQuery<CampaignRow>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM greenhouse_core.campaign_project_links cpl WHERE cpl.campaign_id = c.campaign_id) AS project_count
     FROM greenhouse_core.campaigns c
     ${filters}
     ORDER BY c.updated_at DESC`,
    params
  )

  return rows.map(mapCampaign)
}

export const listAllCampaigns = async (
  options?: { status?: string; limit?: number }
): Promise<Campaign[]> => {
  await ensureCampaignSchema()

  const params: unknown[] = []
  let filters = 'WHERE TRUE'
  let idx = 1

  if (options?.status) {
    filters += ` AND c.status = $${idx}`
    params.push(options.status)
    idx++
  }

  const limit = options?.limit ?? 100

  const rows = await runGreenhousePostgresQuery<CampaignRow>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM greenhouse_core.campaign_project_links cpl WHERE cpl.campaign_id = c.campaign_id) AS project_count
     FROM greenhouse_core.campaigns c
     ${filters}
     ORDER BY c.updated_at DESC
     LIMIT $${idx}`,
    [...params, limit]
  )

  return rows.map(mapCampaign)
}

export const getCampaign = async (campaignId: string): Promise<Campaign | null> => {
  await ensureCampaignSchema()

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
  await ensureCampaignSchema()

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
  await ensureCampaignSchema()

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
  await ensureCampaignSchema()

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
  await ensureCampaignSchema()

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
  await ensureCampaignSchema()

  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_core.campaign_project_links WHERE campaign_project_link_id = $1`,
    [campaignProjectLinkId]
  )
}
