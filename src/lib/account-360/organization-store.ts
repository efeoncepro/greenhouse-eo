import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { generateMembershipId, nextPublicId } from '@/lib/account-360/id-generation'
import { sanitizeSnapshotForPresentation } from '@/lib/finance/client-economics-presentation'
import { computeClientEconomicsSnapshots } from '@/lib/finance/postgres-store-intelligence'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { getOrganizationOperationalServing } from './get-organization-operational-serving'
import type { OrganizationClientFinance, OrganizationFinanceSummary } from '@/views/greenhouse/organizations/types'

/**
 * TASK-872 — Dual-mode query helper. When `client` provided, runs inside the
 * caller's PG transaction (atomicity guarantee). Else falls back to the global
 * pool runner. Backward compat 100% — existing callers pass no `client` and
 * behave identically to pre-TASK-872.
 */
const runQueryWithClient = async <T = unknown>(
  text: string,
  params: unknown[],
  client?: PoolClient
): Promise<T[]> => {
  if (client) {
    const result = await client.query<T extends Record<string, unknown> ? T : never>(text, params)

    return result.rows as T[]
  }

  return runGreenhousePostgresQuery<T extends Record<string, unknown> ? T : never>(text, params) as Promise<T[]>
}

// ── Types ───────────────────────────────────────────────────────────────

export interface OrganizationListItem {
  organizationId: string
  publicId: string
  organizationName: string
  legalName: string | null
  organizationType: string
  industry: string | null
  country: string | null
  hubspotCompanyId: string | null
  status: string
  active: boolean
  spaceCount: number
  membershipCount: number
  uniquePersonCount: number
  createdAt: string
  updatedAt: string
}

export interface OrganizationDetail extends OrganizationListItem {
  taxId: string | null
  taxIdType: string | null
  notes: string | null
  spaces: OrganizationSpace[] | null
  people: OrganizationPerson[] | null
}

export interface OrganizationSpace {
  spaceId: string
  publicId: string
  spaceName: string
  spaceType: string
  clientId: string | null
  status: string
}

export interface OrganizationPerson {
  membershipId: string
  publicId: string
  profileId: string
  fullName: string | null
  canonicalEmail: string | null
  membershipType: string
  roleLabel: string | null
  department: string | null
  isPrimary: boolean
  spaceId: string | null
  memberId?: string | null
  assignedFte?: number | null
  assignmentType?: string | null
  jobLevel?: string | null
  employmentType?: string | null
}

export interface PersonMembership {
  membershipId: string
  publicId: string
  organizationId: string
  organizationName: string
  spaceId: string | null
  clientId: string | null
  membershipType: string
  roleLabel: string | null
  department: string | null
  isPrimary: boolean
}

export interface CreateMembershipInput {
  profileId: string
  organizationId: string
  spaceId?: string
  membershipType: string
  roleLabel?: string
  department?: string
  isPrimary?: boolean
}

// ── Row types ───────────────────────────────────────────────────────────

interface OrgListRow extends Record<string, unknown> {
  organization_id: string
  public_id: string
  organization_name: string
  legal_name: string | null
  organization_type: string
  industry: string | null
  country: string | null
  hubspot_company_id: string | null
  status: string
  active: boolean
  space_count: string
  membership_count: string
  unique_person_count: string
  created_at: Date | string
  updated_at: Date | string
}

interface OrgDetailRow extends OrgListRow {
  tax_id: string | null
  tax_id_type: string | null
  notes: string | null
  spaces: unknown
  people: unknown
}

interface MembershipRow extends Record<string, unknown> {
  membership_id: string
  public_id: string
  profile_id: string
  organization_id: string
  organization_name: string | null
  space_id: string | null
  full_name: string | null
  canonical_email: string | null
  membership_type: string
  role_label: string | null
  department: string | null
  is_primary: boolean
  member_id: string | null
  assigned_fte: string | number | null
  assignment_type: string | null
  job_level: string | null
  employment_type: string | null
}

interface CountRow extends Record<string, unknown> {
  total: string
}

// ── Normalizers ─────────────────────────────────────────────────────────

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0

  return 0
}

const toTs = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') return v

  return ''
}

const toNullableNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null

  if (typeof v === 'number') return Number.isFinite(v) ? v : null

  if (typeof v === 'string') {
    const parsed = Number(v)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const normalizeListItem = (r: OrgListRow): OrganizationListItem => ({
  organizationId: r.organization_id,
  publicId: r.public_id,
  organizationName: r.organization_name,
  legalName: r.legal_name,
  organizationType: r.organization_type ?? 'other',
  industry: r.industry,
  country: r.country,
  hubspotCompanyId: r.hubspot_company_id,
  status: r.status,
  active: r.active,
  spaceCount: toNum(r.space_count),
  membershipCount: toNum(r.membership_count),
  uniquePersonCount: toNum(r.unique_person_count),
  createdAt: toTs(r.created_at),
  updatedAt: toTs(r.updated_at)
})

const normalizeDetail = (r: OrgDetailRow): OrganizationDetail => ({
  ...normalizeListItem(r),
  taxId: r.tax_id,
  taxIdType: r.tax_id_type,
  notes: r.notes,
  spaces: Array.isArray(r.spaces) ? r.spaces as OrganizationSpace[] : null,
  people: Array.isArray(r.people) ? (r.people as OrganizationPerson[]).map(person => ({
    ...person,
    assignedFte: toNullableNum(person.assignedFte)
  })) : null
})

const normalizeMembership = (r: MembershipRow): OrganizationPerson => ({
  membershipId: r.membership_id,
  publicId: r.public_id,
  profileId: r.profile_id,
  fullName: r.full_name,
  canonicalEmail: r.canonical_email,
  membershipType: r.membership_type,
  roleLabel: r.role_label,
  department: r.department,
  isPrimary: r.is_primary,
  spaceId: r.space_id,
  memberId: r.member_id,
  assignedFte: toNullableNum(r.assigned_fte),
  assignmentType: r.assignment_type,
  jobLevel: r.job_level,
  employmentType: r.employment_type
})

const normalizePersonMembership = (r: MembershipRow): PersonMembership => ({
  membershipId: r.membership_id,
  publicId: r.public_id,
  organizationId: r.organization_id,
  organizationName: r.organization_name || '',
  spaceId: r.space_id,
  clientId: (r as Record<string, unknown>).client_id as string | null ?? null,
  membershipType: r.membership_type,
  roleLabel: r.role_label,
  department: r.department,
  isPrimary: r.is_primary
})

// ── Store functions ─────────────────────────────────────────────────────

export const getOrganizationList = async (params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  type?: string
}) => {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50))
  const offset = (page - 1) * pageSize

  let filters = ''
  const queryParams: unknown[] = []
  let paramIdx = 0

  if (params.search) {
    paramIdx++
    const searchParam = `%${params.search}%`

    filters += ` AND (o.organization_name ILIKE $${paramIdx} OR o.legal_name ILIKE $${paramIdx} OR o.public_id ILIKE $${paramIdx})`
    queryParams.push(searchParam)
  }

  if (params.status && params.status !== 'all') {
    paramIdx++
    filters += ` AND o.status = $${paramIdx}`
    queryParams.push(params.status)
  }

  if (params.type && params.type !== 'all') {
    paramIdx++
    filters += ` AND o.organization_type = $${paramIdx}`
    queryParams.push(params.type)
  }

  const countRows = await runGreenhousePostgresQuery<CountRow>(`
    SELECT COUNT(*)::text AS total
    FROM greenhouse_serving.organization_360 o
    WHERE TRUE ${filters}
  `, queryParams)

  const total = toNum(countRows[0]?.total)

  paramIdx++
  const limitParam = paramIdx

  paramIdx++
  const offsetParam = paramIdx

  const rows = await runGreenhousePostgresQuery<OrgListRow>(`
    SELECT
      organization_id, public_id, organization_name, legal_name,
      organization_type, industry, country, hubspot_company_id, status, active,
      space_count::text, membership_count::text, unique_person_count::text,
      created_at, updated_at
    FROM greenhouse_serving.organization_360 o
    WHERE TRUE ${filters}
    ORDER BY organization_name
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `, [...queryParams, pageSize, offset])

  return {
    items: rows.map(normalizeListItem),
    total,
    page,
    pageSize
  }
}

export const getOrganizationDetail = async (id: string): Promise<OrganizationDetail | null> => {
  const rows = await runGreenhousePostgresQuery<OrgDetailRow>(`
    SELECT
      organization_id, public_id, organization_name, legal_name,
      organization_type, tax_id, tax_id_type, industry, country, hubspot_company_id,
      status, active, notes,
      space_count::text, membership_count::text, unique_person_count::text,
      spaces, people,
      created_at, updated_at
    FROM greenhouse_serving.organization_360
    WHERE organization_id = $1 OR public_id = $1
    LIMIT 1
  `, [id])

  return rows.length > 0 ? normalizeDetail(rows[0]) : null
}

export const getOrganizationOperationalMetrics = async (organizationId: string) => {
  return getOrganizationOperationalServing(organizationId)
}


export const updateOrganization = async (
  id: string,
  data: Partial<{
    organizationName: string
    legalName: string
    taxId: string
    taxIdType: string
    industry: string
    country: string
    organizationType: string
    status: string
    notes: string
  }>
) => {
  const updates: string[] = []
  const params: unknown[] = [id]
  let idx = 1

  const fieldMap: Record<string, string> = {
    organizationName: 'organization_name',
    legalName: 'legal_name',
    taxId: 'tax_id',
    taxIdType: 'tax_id_type',
    industry: 'industry',
    country: 'country',
    organizationType: 'organization_type',
    status: 'status',
    notes: 'notes'
  }

  for (const [key, column] of Object.entries(fieldMap)) {
    const value = data[key as keyof typeof data]

    if (value !== undefined) {
      idx++
      updates.push(`${column} = $${idx}`)
      params.push(value)
    }
  }

  if (updates.length === 0) return { updated: false }

  updates.push('updated_at = CURRENT_TIMESTAMP')

  await runGreenhousePostgresQuery(`
    UPDATE greenhouse_core.organizations
    SET ${updates.join(', ')}
    WHERE organization_id = $1
  `, params)

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.organization,
    aggregateId: id,
    eventType: EVENT_TYPES.organizationUpdated,
    payload: { organizationId: id, updatedFields: Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined) }
  })

  return { updated: true }
}

export const getOrganizationMemberships = async (orgId: string): Promise<OrganizationPerson[]> => {
  const rows = await runGreenhousePostgresQuery<MembershipRow>(`
    SELECT
      pm.membership_id, pm.public_id, pm.profile_id,
      pm.organization_id,
      o.organization_name,
      pm.space_id,
      ip.full_name, ip.canonical_email,
      pm.membership_type, pm.role_label, pm.department, pm.is_primary,
      m.member_id,
      assignment_summary.assigned_fte,
      assignment_summary.assignment_type,
      m.job_level,
      m.employment_type
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = pm.profile_id
    LEFT JOIN greenhouse_core.organizations o ON o.organization_id = pm.organization_id
    LEFT JOIN greenhouse_core.members m
      ON m.identity_profile_id = pm.profile_id
     AND m.active = TRUE
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(a.fte_allocation), 0)::numeric AS assigned_fte,
        CASE
          WHEN COUNT(*) = 0 THEN NULL
          WHEN COUNT(DISTINCT a.assignment_type) = 1 THEN MIN(a.assignment_type)
          ELSE 'mixed'
        END AS assignment_type
      FROM greenhouse_core.client_team_assignments a
      JOIN greenhouse_core.spaces s
        ON s.client_id = a.client_id
       AND s.active = TRUE
      WHERE a.member_id = m.member_id
        AND a.active = TRUE
        AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
        AND s.organization_id = pm.organization_id
    ) assignment_summary ON TRUE
    WHERE pm.organization_id = $1 AND pm.active = TRUE
    ORDER BY pm.is_primary DESC, ip.full_name NULLS LAST
  `, [orgId])

  return rows.map(normalizeMembership)
}

export const createMembership = async (
  input: CreateMembershipInput,
  options: { client?: PoolClient } = {}
) => {
  const membershipId = generateMembershipId()
  const publicId = await nextPublicId('EO-MBR')

  await runQueryWithClient(
    `INSERT INTO greenhouse_core.person_memberships (
       membership_id, public_id, profile_id, organization_id, space_id,
       membership_type, role_label, department, is_primary,
       status, active, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
             'active', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      membershipId,
      publicId,
      input.profileId,
      input.organizationId,
      input.spaceId ?? null,
      input.membershipType,
      input.roleLabel ?? null,
      input.department ?? null,
      input.isPrimary ?? false
    ],
    options.client
  )

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.membership,
      aggregateId: membershipId,
      eventType: EVENT_TYPES.membershipCreated,
      payload: { membershipId, profileId: input.profileId, organizationId: input.organizationId, spaceId: input.spaceId ?? null }
    },
    options.client
  )

  return { membershipId, publicId, created: true }
}

export const updateMembership = async (
  membershipId: string,
  data: Partial<{
    membershipType: string
    roleLabel: string
    department: string
    isPrimary: boolean
  }>
) => {
  const updates: string[] = []
  const params: unknown[] = [membershipId]
  let idx = 1

  const fieldMap: Record<string, string> = {
    membershipType: 'membership_type',
    roleLabel: 'role_label',
    department: 'department',
    isPrimary: 'is_primary'
  }

  for (const [key, column] of Object.entries(fieldMap)) {
    const value = data[key as keyof typeof data]

    if (value !== undefined) {
      idx++
      updates.push(`${column} = $${idx}`)
      params.push(value)
    }
  }

  if (updates.length === 0) return { updated: false }

  updates.push('updated_at = CURRENT_TIMESTAMP')

  await runGreenhousePostgresQuery(`
    UPDATE greenhouse_core.person_memberships
    SET ${updates.join(', ')}
    WHERE membership_id = $1
  `, params)

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.membership,
    aggregateId: membershipId,
    eventType: EVENT_TYPES.membershipUpdated,
    payload: { membershipId, updatedFields: Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined) }
  })

  return { updated: true }
}

export const deactivateMembership = async (
  membershipId: string,
  options: { client?: PoolClient } = {}
) => {
  await runQueryWithClient(
    `UPDATE greenhouse_core.person_memberships
     SET active = FALSE, status = 'inactive', updated_at = CURRENT_TIMESTAMP
     WHERE membership_id = $1`,
    [membershipId],
    options.client
  )

  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.membership,
      aggregateId: membershipId,
      eventType: EVENT_TYPES.membershipDeactivated,
      payload: { membershipId }
    },
    options.client
  )

  return { deactivated: true }
}

// ── Finance ────────────────────────────────────────────────────────────

// OrganizationClientFinance and OrganizationFinanceSummary are imported from
// @/views/greenhouse/organizations/types — single source of truth for both
// server and client code. Re-export for backward compatibility.
export type { OrganizationClientFinance, OrganizationFinanceSummary }

interface OrgFinanceRow extends Record<string, unknown> {
  client_id: string
  client_name: string
  total_revenue_clp: string | number
  labor_cost_clp: string | number
  direct_costs_clp: string | number
  indirect_costs_clp: string | number
  gross_margin_percent: string | number | null
  net_margin_percent: string | number | null
  headcount_fte: string | number | null
}

export const getOrganizationFinanceSummary = async (
  orgId: string,
  year: number,
  month: number
): Promise<OrganizationFinanceSummary> => {
  const queryRows = () =>
    runGreenhousePostgresQuery<OrgFinanceRow>(`
      SELECT
        ce.client_id, ce.client_name,
        ce.total_revenue_clp, COALESCE(ce.labor_cost_clp, 0) AS labor_cost_clp,
        ce.direct_costs_clp, ce.indirect_costs_clp,
        ce.gross_margin_percent, ce.net_margin_percent,
        ce.headcount_fte
      FROM greenhouse_finance.client_economics ce
      WHERE ce.period_year = $2 AND ce.period_month = $3
        AND EXISTS (
          SELECT 1
          FROM greenhouse_finance.client_profiles cp
          WHERE cp.organization_id = $1
            AND (cp.client_id = ce.client_id OR cp.organization_id = ce.client_id)
        )
      ORDER BY ce.total_revenue_clp DESC
    `, [orgId, year, month])

  let rows = await queryRows()

  if (rows.length === 0) {
    await computeClientEconomicsSnapshots(
      year,
      month,
      `Auto-computed on organization finance access for org ${orgId}`
    )
    rows = await queryRows()
  }

  const clients: OrganizationClientFinance[] = rows.map(r => {
    const sanitized = sanitizeSnapshotForPresentation({
      clientId: String(r.client_id),
      clientName: String(r.client_name),
      totalRevenueClp: toNum(r.total_revenue_clp),
      laborCostClp: toNum(r.labor_cost_clp),
      directCostsClp: toNum(r.direct_costs_clp),
      indirectCostsClp: toNum(r.indirect_costs_clp),
      grossMarginPercent: r.gross_margin_percent != null ? toNum(r.gross_margin_percent) : null,
      netMarginPercent: r.net_margin_percent != null ? toNum(r.net_margin_percent) : null,
      headcountFte: r.headcount_fte != null ? toNum(r.headcount_fte) : null,
      notes: null
    })

    return sanitized
  })

  const totalRev = clients.reduce((s, c) => s + c.totalRevenueClp, 0)
  const totalLabor = clients.reduce((s, c) => s + (c.laborCostClp ?? 0), 0)
  const totalDirect = clients.reduce((s, c) => s + c.directCostsClp, 0)
  const totalIndirect = clients.reduce((s, c) => s + c.indirectCostsClp, 0)
  const totalFte = clients.reduce((s, c) => s + (c.headcountFte ?? 0), 0)

  // Revenue-weighted average margins
  let avgGross: number | null = null
  let avgNet: number | null = null

  const validForGross = clients.filter(c => c.grossMarginPercent != null)
  const validGrossRevenue = validForGross.reduce((sum, client) => sum + client.totalRevenueClp, 0)
  const validForNet = clients.filter(c => c.netMarginPercent != null)
  const validNetRevenue = validForNet.reduce((sum, client) => sum + client.totalRevenueClp, 0)

  if (validGrossRevenue > 0) {
    avgGross = validForGross.reduce((sum, client) => sum + (client.grossMarginPercent ?? 0) * client.totalRevenueClp, 0) / validGrossRevenue
  }

  if (validNetRevenue > 0) {
    avgNet = validForNet.reduce((sum, client) => sum + (client.netMarginPercent ?? 0) * client.totalRevenueClp, 0) / validNetRevenue
  }

  return {
    organizationId: orgId,
    periodYear: year,
    periodMonth: month,
    clientCount: clients.length,
    totalRevenueClp: totalRev,
    totalLaborCostClp: totalLabor,
    totalDirectCostsClp: totalDirect,
    totalIndirectCostsClp: totalIndirect,
    avgGrossMarginPercent: avgGross,
    avgNetMarginPercent: avgNet,
    totalFte: totalFte > 0 ? totalFte : null,
    clients
  }
}

// ── Identity helpers (for HubSpot sync) ────────────────────────────────

interface ProfileRow extends Record<string, unknown> {
  profile_id: string
  full_name: string | null
  canonical_email: string | null
}

export const findProfileByEmail = async (email: string): Promise<{ profileId: string; fullName: string | null } | null> => {
  const rows = await runGreenhousePostgresQuery<ProfileRow>(`
    SELECT profile_id, full_name, canonical_email
    FROM greenhouse_core.identity_profiles
    WHERE LOWER(canonical_email) = LOWER($1) AND active = TRUE
    LIMIT 1
  `, [email])

  if (rows.length === 0) return null

  return { profileId: rows[0].profile_id, fullName: rows[0].full_name ?? null }
}

export const membershipExists = async (profileId: string, organizationId: string): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(`
    SELECT 1 FROM greenhouse_core.person_memberships
    WHERE profile_id = $1 AND organization_id = $2 AND active = TRUE
    LIMIT 1
  `, [profileId, organizationId])

  return rows.length > 0
}

const normalizeToken = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const buildIdentityProfileId = (source: { sourceSystem: string; sourceObjectType: string; sourceObjectId: string }) =>
  `identity-${normalizeToken(source.sourceSystem)}-${normalizeToken(source.sourceObjectType)}-${normalizeToken(source.sourceObjectId)}`

export const createIdentityProfile = async (data: {
  sourceSystem: string
  sourceObjectType: string
  sourceObjectId: string
  fullName: string
  canonicalEmail?: string | null
}): Promise<string> => {
  const canonicalEmail = data.canonicalEmail?.trim().toLowerCase() || null

  if (canonicalEmail) {
    const existing = await findProfileByEmail(canonicalEmail)

    if (existing?.profileId) {
      return existing.profileId
    }
  }

  const profileId = buildIdentityProfileId(data)

  await runGreenhousePostgresQuery(`
    INSERT INTO greenhouse_core.identity_profiles (
      profile_id, full_name, canonical_email, profile_type,
      primary_source_system, primary_source_object_type, primary_source_object_id,
      active, created_at, updated_at
    ) VALUES ($1, $2, $3, 'external_contact', $4, $5, $6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (profile_id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      canonical_email = COALESCE(EXCLUDED.canonical_email, greenhouse_core.identity_profiles.canonical_email),
      updated_at = CURRENT_TIMESTAMP,
      active = TRUE
  `, [
    profileId,
    data.fullName,
    canonicalEmail,
    data.sourceSystem,
    data.sourceObjectType,
    data.sourceObjectId
  ])

  return profileId
}

export const ensureOrganizationContactMembership = async (data: {
  organizationId: string
  sourceSystem: string
  sourceObjectType: string
  sourceObjectId: string
  fullName: string
  canonicalEmail?: string | null
  membershipType?: string
  roleLabel?: string | null
  isPrimary?: boolean
}): Promise<string | null> => {
  const fullName = data.fullName.trim()

  if (!fullName) {
    return null
  }

  const profileId = await createIdentityProfile({
    sourceSystem: data.sourceSystem,
    sourceObjectType: data.sourceObjectType,
    sourceObjectId: data.sourceObjectId,
    fullName,
    canonicalEmail: data.canonicalEmail ?? null
  })

  const exists = await membershipExists(profileId, data.organizationId)

  if (!exists) {
    await createMembership({
      profileId,
      organizationId: data.organizationId,
      membershipType: data.membershipType ?? 'contact',
      roleLabel: data.roleLabel ?? undefined,
      isPrimary: data.isPrimary ?? true
    })
  }

  return profileId
}

// ── People search ──────────────────────────────────────────────────────

export const searchProfiles = async (query: string): Promise<Array<{ profileId: string; fullName: string | null; canonicalEmail: string | null }>> => {
  const pattern = `%${query}%`

  const rows = await runGreenhousePostgresQuery<ProfileRow>(`
    SELECT profile_id, full_name, canonical_email
    FROM greenhouse_core.identity_profiles
    WHERE (full_name ILIKE $1 OR canonical_email ILIKE $1) AND active = TRUE
    ORDER BY full_name NULLS LAST
    LIMIT 10
  `, [pattern])

  return rows.map(r => ({
    profileId: r.profile_id,
    fullName: r.full_name ?? null,
    canonicalEmail: r.canonical_email ?? null
  }))
}

// ── Organization search ───────────────────────────────────────────────

interface OrgSearchRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string
  public_id: string
}

interface SpaceClientIdRow extends Record<string, unknown> {
  client_id: string | null
}

export const searchOrganizations = async (query: string): Promise<Array<{ organizationId: string; organizationName: string; publicId: string }>> => {
  const pattern = `%${query}%`

  const rows = await runGreenhousePostgresQuery<OrgSearchRow>(`
    SELECT organization_id, organization_name, public_id
    FROM greenhouse_core.organizations
    WHERE (organization_name ILIKE $1 OR legal_name ILIKE $1) AND active = TRUE
    ORDER BY organization_name
    LIMIT 10
  `, [pattern])

  return rows.map(r => ({
    organizationId: r.organization_id,
    organizationName: r.organization_name,
    publicId: r.public_id
  }))
}

export const getOrganizationClientIds = async (organizationId: string): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<SpaceClientIdRow>(`
    SELECT DISTINCT s.client_id
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = $1
      AND s.active = TRUE
      AND s.client_id IS NOT NULL
    ORDER BY s.client_id
  `, [organizationId])

  return rows
    .map(row => (typeof row.client_id === 'string' ? row.client_id.trim() : ''))
    .filter(Boolean)
}

// ── Person memberships ─────────────────────────────────────────────────

export const getPersonMemberships = async (profileId: string): Promise<PersonMembership[]> => {
  const rows = await runGreenhousePostgresQuery<MembershipRow>(`
    SELECT
      pm.membership_id, pm.public_id,
      pm.profile_id,
      pm.organization_id,
      o.organization_name,
      pm.space_id,
      COALESCE(s.client_id, (
        SELECT s2.client_id FROM greenhouse_core.spaces s2
        WHERE s2.organization_id = pm.organization_id AND s2.client_id IS NOT NULL
        LIMIT 1
      )) AS client_id,
      ip.full_name, ip.canonical_email,
      pm.membership_type, pm.role_label, pm.department, pm.is_primary
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.organizations o ON o.organization_id = pm.organization_id
    JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = pm.profile_id
    LEFT JOIN greenhouse_core.spaces s ON s.space_id = pm.space_id
    WHERE pm.profile_id = $1 AND pm.active = TRUE
    ORDER BY pm.is_primary DESC, o.organization_name
  `, [profileId])

  return rows.map(normalizePersonMembership)
}
