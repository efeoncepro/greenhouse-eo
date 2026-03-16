import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { generateMembershipId, nextPublicId } from '@/lib/account-360/id-generation'

// ── Types ───────────────────────────────────────────────────────────────

export interface OrganizationListItem {
  organizationId: string
  publicId: string
  organizationName: string
  legalName: string | null
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
}

export interface PersonMembership {
  membershipId: string
  publicId: string
  organizationId: string
  organizationName: string
  spaceId: string | null
  membershipType: string
  roleLabel: string | null
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

const normalizeListItem = (r: OrgListRow): OrganizationListItem => ({
  organizationId: r.organization_id,
  publicId: r.public_id,
  organizationName: r.organization_name,
  legalName: r.legal_name,
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
  people: Array.isArray(r.people) ? r.people as OrganizationPerson[] : null
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
  spaceId: r.space_id
})

const normalizePersonMembership = (r: MembershipRow): PersonMembership => ({
  membershipId: r.membership_id,
  publicId: r.public_id,
  organizationId: r.organization_id,
  organizationName: r.organization_name || '',
  spaceId: r.space_id,
  membershipType: r.membership_type,
  roleLabel: r.role_label,
  isPrimary: r.is_primary
})

// ── Store functions ─────────────────────────────────────────────────────

export const getOrganizationList = async (params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
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
      industry, country, hubspot_company_id, status, active,
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
      tax_id, tax_id_type, industry, country, hubspot_company_id,
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

export const updateOrganization = async (
  id: string,
  data: Partial<{
    organizationName: string
    legalName: string
    taxId: string
    taxIdType: string
    industry: string
    country: string
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
      pm.membership_type, pm.role_label, pm.department, pm.is_primary
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = pm.profile_id
    LEFT JOIN greenhouse_core.organizations o ON o.organization_id = pm.organization_id
    WHERE pm.organization_id = $1 AND pm.active = TRUE
    ORDER BY pm.is_primary DESC, ip.full_name NULLS LAST
  `, [orgId])

  return rows.map(normalizeMembership)
}

export const createMembership = async (input: CreateMembershipInput) => {
  const membershipId = generateMembershipId()
  const publicId = await nextPublicId('EO-MBR')

  await runGreenhousePostgresQuery(`
    INSERT INTO greenhouse_core.person_memberships (
      membership_id, public_id, profile_id, organization_id, space_id,
      membership_type, role_label, department, is_primary,
      status, active, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
            'active', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
    membershipId,
    publicId,
    input.profileId,
    input.organizationId,
    input.spaceId ?? null,
    input.membershipType,
    input.roleLabel ?? null,
    input.department ?? null,
    input.isPrimary ?? false
  ])

  return { membershipId, publicId, created: true }
}

// ── Finance ────────────────────────────────────────────────────────────

export interface OrganizationClientFinance {
  clientId: string
  clientName: string
  totalRevenueClp: number
  directCostsClp: number
  indirectCostsClp: number
  grossMarginPercent: number | null
  netMarginPercent: number | null
  headcountFte: number | null
}

export interface OrganizationFinanceSummary {
  organizationId: string
  periodYear: number
  periodMonth: number
  clientCount: number
  totalRevenueClp: number
  totalDirectCostsClp: number
  totalIndirectCostsClp: number
  avgGrossMarginPercent: number | null
  avgNetMarginPercent: number | null
  totalFte: number | null
  clients: OrganizationClientFinance[]
}

interface OrgFinanceRow extends Record<string, unknown> {
  client_id: string
  client_name: string
  total_revenue_clp: string | number
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
  const rows = await runGreenhousePostgresQuery<OrgFinanceRow>(`
    SELECT
      ce.client_id, ce.client_name,
      ce.total_revenue_clp, ce.direct_costs_clp, ce.indirect_costs_clp,
      ce.gross_margin_percent, ce.net_margin_percent,
      ce.headcount_fte
    FROM greenhouse_finance.client_economics ce
    JOIN greenhouse_finance.client_profiles cp ON cp.client_id = ce.client_id
    WHERE cp.organization_id = $1 AND ce.period_year = $2 AND ce.period_month = $3
    ORDER BY ce.total_revenue_clp DESC
  `, [orgId, year, month])

  const clients: OrganizationClientFinance[] = rows.map(r => ({
    clientId: String(r.client_id),
    clientName: String(r.client_name),
    totalRevenueClp: toNum(r.total_revenue_clp),
    directCostsClp: toNum(r.direct_costs_clp),
    indirectCostsClp: toNum(r.indirect_costs_clp),
    grossMarginPercent: r.gross_margin_percent != null ? toNum(r.gross_margin_percent) : null,
    netMarginPercent: r.net_margin_percent != null ? toNum(r.net_margin_percent) : null,
    headcountFte: r.headcount_fte != null ? toNum(r.headcount_fte) : null
  }))

  const totalRev = clients.reduce((s, c) => s + c.totalRevenueClp, 0)
  const totalDirect = clients.reduce((s, c) => s + c.directCostsClp, 0)
  const totalIndirect = clients.reduce((s, c) => s + c.indirectCostsClp, 0)
  const totalFte = clients.reduce((s, c) => s + (c.headcountFte ?? 0), 0)

  // Revenue-weighted average margins
  let avgGross: number | null = null
  let avgNet: number | null = null

  if (totalRev > 0) {
    avgGross = clients.reduce((s, c) => s + (c.grossMarginPercent ?? 0) * c.totalRevenueClp, 0) / totalRev
    avgNet = clients.reduce((s, c) => s + (c.netMarginPercent ?? 0) * c.totalRevenueClp, 0) / totalRev
  }

  return {
    organizationId: orgId,
    periodYear: year,
    periodMonth: month,
    clientCount: clients.length,
    totalRevenueClp: totalRev,
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
  canonicalEmail: string
}): Promise<string> => {
  const profileId = buildIdentityProfileId(data)

  await runGreenhousePostgresQuery(`
    INSERT INTO greenhouse_core.identity_profiles (
      profile_id, full_name, canonical_email, source_system,
      source_object_type, source_object_id, active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (profile_id) DO NOTHING
  `, [
    profileId,
    data.fullName,
    data.canonicalEmail.toLowerCase(),
    data.sourceSystem,
    data.sourceObjectType,
    data.sourceObjectId
  ])

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

// ── Person memberships ─────────────────────────────────────────────────

export const getPersonMemberships = async (profileId: string): Promise<PersonMembership[]> => {
  const rows = await runGreenhousePostgresQuery<MembershipRow>(`
    SELECT
      pm.membership_id, pm.public_id,
      pm.profile_id,
      pm.organization_id,
      o.organization_name,
      pm.space_id,
      ip.full_name, ip.canonical_email,
      pm.membership_type, pm.role_label, pm.department, pm.is_primary
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.organizations o ON o.organization_id = pm.organization_id
    JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = pm.profile_id
    WHERE pm.profile_id = $1 AND pm.active = TRUE
    ORDER BY pm.is_primary DESC, o.organization_name
  `, [profileId])

  return rows.map(normalizePersonMembership)
}
