import 'server-only'

import type { CompensationVersion } from '@/types/payroll'
import type { PersonAccess, PersonDetail, PersonDetailAssignment, PersonDetailMember, PersonIntegrations } from '@/types/people'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getOrganizationClientIds, getPersonMemberships } from '@/lib/account-360/organization-store'
import { getPersonDeliveryContext } from '@/lib/person-360/get-person-delivery'
import { getPersonHrContext } from '@/lib/person-360/get-person-hr'
import { resolvePersonIdentifier } from '@/lib/person-360/resolve-eo-id'
import { getMemberPayrollHistory } from '@/lib/payroll/get-payroll-entries'
import { getPersonFinanceOverview } from '@/lib/people/get-person-finance-overview'
import { getPersonOperationalMetrics } from '@/lib/people/get-person-operational-metrics'
import { buildPersonAccessContext, buildPersonIdentityContext } from '@/lib/people/person-context'
import {
  PeopleValidationError,
  getIdentityConfidence,
  getPeopleTableColumns,
  inferRoleCategory,
  mapIdentityProvider,
  pickMemberEmails,
  roundToTenths,
  runPeopleQuery,
  toContactChannel,
  toDateString,
  toNullableNumber,
  toNumber,
  toStringArray,
  enrichProfile
} from '@/lib/people/shared'
import { getPersonProfileByEoId, getPersonProfileByMemberId } from '@/lib/person-360/get-person-profile'
import { readLatestMemberCapacityEconomicsSnapshot, type MemberCapacityEconomicsSnapshot } from '@/lib/member-capacity-economics/store'
import { readPersonIntelligence } from '@/lib/person-intelligence/store'
import type { PersonIntelligenceSnapshot } from '@/lib/person-intelligence/types'
import type { TeamIdentityProvider } from '@/types/team'

type MemberRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  email_aliases: string[] | null
  role_title: string | null
  role_category: string | null
  avatar_url: string | null
  active: boolean | null
  contact_channel: string | null
  contact_handle: string | null
  identity_profile_id: string | null
  notion_user_id: string | null
  azure_oid: string | null
  hubspot_owner_id: string | null
  first_name: string | null
  last_name: string | null
  preferred_name: string | null
  legal_name: string | null
  org_role_id: string | null
  org_role_name: string | null
  profession_id: string | null
  profession_name: string | null
  seniority_level: string | null
  employment_type: string | null
  birth_date: { value?: string } | string | null
  phone: string | null
  teams_user_id: string | null
  slack_user_id: string | null
  location_city: string | null
  location_country: string | null
  time_zone: string | null
  years_experience: number | string | null
  efeonce_start_date: { value?: string } | string | null
  biography: string | null
  languages: string[] | null
}

type AssignmentRow = {
  assignment_id: string | null
  client_id: string | null
  client_name: string | null
  fte_allocation: number | string | null
  hours_per_month: number | string | null
  role_title_override: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  active: boolean | null
  assignment_type: string | null
  placement_id: string | null
  placement_status: string | null
}

type IdentitySourceRow = {
  source_object_id: string | null
  source_user_id: string | null
  source_email: string | null
  source_display_name: string | null
  source_system: string | null
}

const getProjectId = () => getBigQueryProjectId()

const getCurrentCompensationFromHistory = (history: CompensationVersion[]) => history.find(item => item.isCurrent) || null

const getCurrentDateString = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago'
  }).format(new Date())

const normalizeAssignments = (rows: AssignmentRow[]): PersonDetailAssignment[] =>
  rows.map(row => ({
    assignmentId: String(row.assignment_id || ''),
    clientId: String(row.client_id || ''),
    clientName: String(row.client_name || row.client_id || 'Space'),
    fteAllocation: roundToTenths(toNumber(row.fte_allocation)),
    hoursPerMonth: toNullableNumber(row.hours_per_month),
    roleTitleOverride: row.role_title_override || null,
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    active: Boolean(row.active),
    assignmentType: row.assignment_type || 'internal',
    placementId: row.placement_id || null,
    placementStatus: row.placement_status || null
  }))

const buildAssignmentsSummary = (rows: AssignmentRow[]) => {
  const today = getCurrentDateString()

  const activeRows = rows.filter(row => {
    if (!Boolean(row.active)) {
      return false
    }

    const endDate = toDateString(row.end_date)

    return !endDate || endDate >= today
  })

  const activeAssignments = activeRows.length

  const totalFte = roundToTenths(
    activeRows.reduce((sum, row) => sum + toNumber(row.fte_allocation), 0)
  )

  const totalHoursMonth = activeRows.reduce((sum, row) => {
    const explicitHours = toNullableNumber(row.hours_per_month)

    return sum + (explicitHours ?? Math.round(toNumber(row.fte_allocation) * 160))
  }, 0)

  return {
    activeAssignments,
    contractedFte: 1,
    assignedFte: totalFte,
    totalFte,
    totalHoursMonth
  }
}

/**
 * Build capacity summary from canonical snapshots.
 * Per GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1 consumer rules:
 * "no recalcular costPerHour ni contracted/assigned/used por otra vía si el snapshot ya lo resuelve"
 */
const buildCapacityFromSnapshot = (
  snapshot: MemberCapacityEconomicsSnapshot,
  intelligence: PersonIntelligenceSnapshot | null
): PersonDetail['capacity'] => ({
  contractedHoursMonth: snapshot.contractedHours,
  assignedHoursMonth: snapshot.assignedHours,
  commercialAvailabilityHours: snapshot.commercialAvailabilityHours,
  usageKind: snapshot.usageKind,
  usedHours: snapshot.usedHours,
  utilizationPercent: intelligence?.derivedMetrics.find(m => m.metricId === 'utilization_pct')?.value ?? snapshot.usagePercent ?? 0,
  capacityHealth: intelligence?.capacity.capacityHealth ?? (snapshot.snapshotStatus === 'complete' ? 'normal' : 'unknown'),
  activeAssets: intelligence?.deliveryMetrics.find(m => m.metricId === 'throughput')?.value != null
    ? (intelligence.capacity.activeAssignmentCount ?? 0)
    : 0,
  completedAssets: intelligence?.deliveryMetrics.find(m => m.metricId === 'throughput')?.value ?? 0,
  expectedMonthlyThroughput: intelligence?.capacity.expectedThroughput ?? 0
})

const buildIntegrations = ({
  providers,
  notionUserId,
  azureOid,
  hubspotOwnerId,
  identityConfidence
}: {
  providers: TeamIdentityProvider[]
  notionUserId: string | null
  azureOid: string | null
  hubspotOwnerId: string | null
  identityConfidence: 'strong' | 'partial' | 'basic'
}): PersonIntegrations => ({
  microsoftLinked: providers.includes('microsoft') || Boolean(azureOid),
  notionLinked: providers.includes('notion') || Boolean(notionUserId),
  hubspotLinked: providers.includes('hubspot') || Boolean(hubspotOwnerId),
  identityConfidence,
  linkedProviders: [...new Set(providers)].sort((left, right) => left.localeCompare(right))
})

const buildIdentityMatchPayload = ({
  notionUserId,
  identityRows
}: {
  notionUserId: string | null
  identityRows: IdentitySourceRow[]
}) => {
  const notionUserCandidates = new Set<string>()
  const identityMatchSignals = new Set<string>()

  if (notionUserId) {
    notionUserCandidates.add(notionUserId)
  }

  for (const row of identityRows) {
    const provider = mapIdentityProvider(row.source_system)

    if (provider === 'notion') {
      ;[row.source_object_id, row.source_user_id].forEach(value => {
        const normalized = String(value || '').trim()

        if (normalized) {
          notionUserCandidates.add(normalized)
        }
      })
    }

    ;[row.source_email, row.source_display_name].forEach(value => {
      const normalized = String(value || '').trim()

      if (normalized) {
        identityMatchSignals.add(normalized)
      }
    })
  }

  return {
    notionUserCandidates: Array.from(notionUserCandidates),
    identityMatchSignals: Array.from(identityMatchSignals)
  }
}

const buildPersonMember = (row: MemberRow): {
  member: PersonDetailMember
  emailAliases: string[]
} => {
  const emailAliases = toStringArray(row.email_aliases)

  const { publicEmail, internalEmail } = pickMemberEmails({
    email: row.email,
    emailAliases
  })

  const profile = enrichProfile({
    firstName: row.first_name,
    lastName: row.last_name,
    preferredName: row.preferred_name,
    legalName: row.legal_name,
    orgRoleId: row.org_role_id,
    orgRoleName: row.org_role_name,
    professionId: row.profession_id,
    professionName: row.profession_name,
    seniorityLevel: row.seniority_level,
    employmentType: row.employment_type,
    birthDate: toDateString(row.birth_date),
    phone: row.phone,
    teamsUserId: row.teams_user_id,
    slackUserId: row.slack_user_id,
    locationCity: row.location_city,
    locationCountry: row.location_country,
    timeZone: row.time_zone,
    yearsExperience: toNullableNumber(row.years_experience),
    efeonceStartDate: toDateString(row.efeonce_start_date),
    biography: row.biography,
    languages: toStringArray(row.languages)
  })

  return {
    member: {
      eoId: null, // resolved later via person_360
      memberId: String(row.member_id || ''),
      displayName: String(row.display_name || 'Sin nombre'),
      publicEmail,
      internalEmail,
      avatarUrl: row.avatar_url || null,
      roleTitle: String(row.role_title || 'Efeonce Team'),
      roleCategory: String(row.role_category || inferRoleCategory(row.role_title)),
      active: Boolean(row.active),
      contactChannel: toContactChannel(row.contact_channel),
      contactHandle: row.contact_handle || null,
      profile,
      identityProfileId: row.identity_profile_id || null,
      notionUserId: row.notion_user_id || null,
      azureOid: row.azure_oid || null,
      hubspotOwnerId: row.hubspot_owner_id || null
    },
    emailAliases
  }
}

// ---------------------------------------------------------------------------
// Postgres-first query helpers
// ---------------------------------------------------------------------------

const shouldFallbackToLegacy = (error: unknown) => {
  if (!(error instanceof Error)) return false

  const msg = error.message.toLowerCase()

  return (
    msg.includes('not configured') ||
    msg.includes('econnrefused') ||
    msg.includes('timeout') ||
    msg.includes('connect') ||
    msg.includes('cloud sql') ||
    msg.includes('cloudsql') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('not authorized')
  )
}

const getMemberByIdFromPostgres = async (memberId: string): Promise<MemberRow | null> => {
  const rows = await runGreenhousePostgresQuery<{
    member_id: string | null
    display_name: string | null
    primary_email: string | null
    email_aliases: string[] | null
    role_title: string | null
    role_category: string | null
    avatar_url: string | null
    active: boolean | null
    contact_channel: string | null
    contact_handle: string | null
    identity_profile_id: string | null
    notion_user_id: string | null
    azure_oid: string | null
    hubspot_owner_id: string | null
    first_name: string | null
    last_name: string | null
    preferred_name: string | null
    legal_name: string | null
    org_role_id: string | null
    profession_id: string | null
    seniority_level: string | null
    employment_type: string | null
    birth_date: string | null
    phone: string | null
    teams_user_id: string | null
    slack_user_id: string | null
    location_city: string | null
    location_country: string | null
    time_zone: string | null
    years_experience: string | number | null
    efeonce_start_date: string | null
    biography: string | null
    languages: string[] | null
  }>(`
    SELECT
      m.member_id,
      m.display_name,
      m.primary_email,
      COALESCE(m.email_aliases, ARRAY[]::text[]) AS email_aliases,
      m.role_title,
      m.role_category,
      m.avatar_url,
      m.active,
      m.contact_channel,
      m.contact_handle,
      m.identity_profile_id,
      m.notion_user_id,
      m.azure_oid,
      m.hubspot_owner_id,
      m.first_name,
      m.last_name,
      m.preferred_name,
      m.legal_name,
      m.org_role_id,
      m.profession_id,
      m.seniority_level,
      m.employment_type,
      m.birth_date::text,
      m.phone,
      m.teams_user_id,
      m.slack_user_id,
      m.location_city,
      m.location_country,
      m.time_zone,
      m.years_experience,
      m.efeonce_start_date::text,
      m.biography,
      COALESCE(m.languages, ARRAY[]::text[]) AS languages
    FROM greenhouse_core.members m
    WHERE m.member_id = $1
    LIMIT 1
  `, [memberId])

  const row = rows[0]

  if (!row) return null

  return {
    member_id: row.member_id,
    display_name: row.display_name,
    email: row.primary_email,
    email_aliases: row.email_aliases,
    role_title: row.role_title,
    role_category: row.role_category,
    avatar_url: row.avatar_url,
    active: row.active,
    contact_channel: row.contact_channel,
    contact_handle: row.contact_handle,
    identity_profile_id: row.identity_profile_id,
    notion_user_id: row.notion_user_id,
    azure_oid: row.azure_oid,
    hubspot_owner_id: row.hubspot_owner_id,
    first_name: row.first_name,
    last_name: row.last_name,
    preferred_name: row.preferred_name,
    legal_name: row.legal_name,
    org_role_id: row.org_role_id,
    org_role_name: null, // catalogs not in Postgres
    profession_id: row.profession_id,
    profession_name: null, // catalogs not in Postgres
    seniority_level: row.seniority_level,
    employment_type: row.employment_type,
    birth_date: row.birth_date,
    phone: row.phone,
    teams_user_id: row.teams_user_id,
    slack_user_id: row.slack_user_id,
    location_city: row.location_city,
    location_country: row.location_country,
    time_zone: row.time_zone,
    years_experience: row.years_experience,
    efeonce_start_date: row.efeonce_start_date,
    biography: row.biography,
    languages: row.languages
  }
}

const getAssignmentsByMemberFromPostgres = async (memberId: string): Promise<AssignmentRow[]> =>
  runGreenhousePostgresQuery<AssignmentRow>(`
    SELECT
      a.assignment_id,
      a.client_id,
      COALESCE(c.client_name, a.client_id) AS client_name,
      a.fte_allocation,
      a.hours_per_month,
      a.role_title_override,
      a.start_date::text AS start_date,
      a.end_date::text AS end_date,
      a.active,
      a.assignment_type,
      p.placement_id,
      p.status AS placement_status
    FROM greenhouse_core.client_team_assignments a
    LEFT JOIN greenhouse_core.clients c ON c.client_id = a.client_id
    LEFT JOIN greenhouse_delivery.staff_aug_placements p ON p.assignment_id = a.assignment_id
    WHERE a.member_id = $1
    ORDER BY a.active DESC, a.start_date DESC, c.client_name
  `, [memberId])

const getIdentityProvidersByProfileFromPostgres = async (identityProfileId: string): Promise<IdentitySourceRow[]> =>
  runGreenhousePostgresQuery<IdentitySourceRow>(`
    SELECT
      source_system,
      source_object_id,
      source_user_id,
      source_email,
      source_display_name
    FROM greenhouse_core.identity_profile_source_links
    WHERE active = TRUE
      AND profile_id = $1
  `, [identityProfileId])

// ---------------------------------------------------------------------------
// BigQuery fallback query helpers
// ---------------------------------------------------------------------------

const getMemberByIdFromBigQuery = async (memberId: string) => {
  const projectId = getProjectId()
  const memberColumns = await getPeopleTableColumns('greenhouse', 'team_members')
  const roleCatalogColumns = await getPeopleTableColumns('greenhouse', 'team_role_catalog')
  const professionCatalogColumns = await getPeopleTableColumns('greenhouse', 'team_profession_catalog')

  const emailAliasesSelect = memberColumns.has('email_aliases')
    ? 'COALESCE(m.email_aliases, ARRAY<STRING>[]) AS email_aliases,'
    : 'ARRAY<STRING>[] AS email_aliases,'

  const canJoinRoleCatalog = memberColumns.has('org_role_id') && roleCatalogColumns.size > 0
  const canJoinProfessionCatalog = memberColumns.has('profession_id') && professionCatalogColumns.size > 0

  const rows = await runPeopleQuery<MemberRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.email,
        ${emailAliasesSelect}
        m.role_title,
        m.role_category,
        m.avatar_url,

        m.active,
        m.contact_channel,
        m.contact_handle,
        ${memberColumns.has('identity_profile_id') ? 'm.identity_profile_id,' : 'CAST(NULL AS STRING) AS identity_profile_id,'}
        m.notion_user_id,
        m.azure_oid,
        m.hubspot_owner_id,
        ${memberColumns.has('first_name') ? 'm.first_name,' : 'CAST(NULL AS STRING) AS first_name,'}
        ${memberColumns.has('last_name') ? 'm.last_name,' : 'CAST(NULL AS STRING) AS last_name,'}
        ${memberColumns.has('preferred_name') ? 'm.preferred_name,' : 'CAST(NULL AS STRING) AS preferred_name,'}
        ${memberColumns.has('legal_name') ? 'm.legal_name,' : 'CAST(NULL AS STRING) AS legal_name,'}
        ${memberColumns.has('org_role_id') ? 'm.org_role_id,' : 'CAST(NULL AS STRING) AS org_role_id,'}
        ${canJoinRoleCatalog ? 'rc.role_name AS org_role_name,' : 'CAST(NULL AS STRING) AS org_role_name,'}
        ${memberColumns.has('profession_id') ? 'm.profession_id,' : 'CAST(NULL AS STRING) AS profession_id,'}
        ${canJoinProfessionCatalog ? 'pc.profession_name AS profession_name,' : 'CAST(NULL AS STRING) AS profession_name,'}
        ${memberColumns.has('seniority_level') ? 'm.seniority_level,' : 'CAST(NULL AS STRING) AS seniority_level,'}
        ${memberColumns.has('employment_type') ? 'm.employment_type,' : 'CAST(NULL AS STRING) AS employment_type,'}
        ${memberColumns.has('birth_date') ? 'm.birth_date,' : 'CAST(NULL AS DATE) AS birth_date,'}
        ${memberColumns.has('phone') ? 'm.phone,' : 'CAST(NULL AS STRING) AS phone,'}
        ${memberColumns.has('teams_user_id') ? 'm.teams_user_id,' : 'CAST(NULL AS STRING) AS teams_user_id,'}
        ${memberColumns.has('slack_user_id') ? 'm.slack_user_id,' : 'CAST(NULL AS STRING) AS slack_user_id,'}
        ${memberColumns.has('location_city') ? 'm.location_city,' : 'CAST(NULL AS STRING) AS location_city,'}
        ${memberColumns.has('location_country') ? 'm.location_country,' : 'CAST(NULL AS STRING) AS location_country,'}
        ${memberColumns.has('time_zone') ? 'm.time_zone,' : 'CAST(NULL AS STRING) AS time_zone,'}
        ${memberColumns.has('years_experience') ? 'm.years_experience,' : 'CAST(NULL AS FLOAT64) AS years_experience,'}
        ${memberColumns.has('efeonce_start_date') ? 'm.efeonce_start_date,' : 'CAST(NULL AS DATE) AS efeonce_start_date,'}
        ${memberColumns.has('biography') ? 'm.biography,' : 'CAST(NULL AS STRING) AS biography,'}
        ${memberColumns.has('languages') ? 'COALESCE(m.languages, ARRAY<STRING>[]) AS languages' : 'ARRAY<STRING>[] AS languages'}
      FROM \`${projectId}.greenhouse.team_members\` AS m
      ${canJoinRoleCatalog ? `LEFT JOIN \`${projectId}.greenhouse.team_role_catalog\` AS rc ON rc.role_id = m.org_role_id AND rc.active = TRUE` : ''}
      ${canJoinProfessionCatalog ? `LEFT JOIN \`${projectId}.greenhouse.team_profession_catalog\` AS pc ON pc.profession_id = m.profession_id AND pc.active = TRUE` : ''}
      WHERE m.member_id = @memberId
      LIMIT 1
    `,
    { memberId }
  )

  return rows[0] || null
}

const getAssignmentsByMemberFromBigQuery = async (memberId: string) => {
  const projectId = getProjectId()

  return runPeopleQuery<AssignmentRow>(
    `
      SELECT
        a.assignment_id,
        a.client_id,
        COALESCE(c.client_name, a.client_id) AS client_name,
        a.fte_allocation,
        a.hours_per_month,
        a.role_title_override,
        a.start_date,
        a.end_date,
        a.active
      FROM \`${projectId}.greenhouse.client_team_assignments\` AS a
      LEFT JOIN \`${projectId}.greenhouse.clients\` AS c
        ON c.client_id = a.client_id
      WHERE a.member_id = @memberId
      ORDER BY a.active DESC, a.start_date DESC, client_name
    `,
    { memberId }
  )
}

const getIdentityProvidersByProfileFromBigQuery = async (identityProfileId: string) => {
  const projectId = getProjectId()

  return runPeopleQuery<IdentitySourceRow>(
    `
      SELECT
        source_system,
        source_object_id,
        source_user_id,
        source_email,
        source_display_name
      FROM \`${projectId}.greenhouse.identity_profile_source_links\`
      WHERE active = TRUE
        AND profile_id = @identityProfileId
    `,
    { identityProfileId }
  )
}

// ---------------------------------------------------------------------------
// Postgres-first with BigQuery fallback wrappers
// ---------------------------------------------------------------------------

const getMemberById = async (memberId: string): Promise<MemberRow | null> => {
  if (isGreenhousePostgresConfigured()) {
    try {
      return await getMemberByIdFromPostgres(memberId)
    } catch (error) {
      if (!shouldFallbackToLegacy(error)) throw error
      console.warn('[people/detail] member lookup Postgres failed, falling back:', error instanceof Error ? error.message : error)
    }
  }

  return getMemberByIdFromBigQuery(memberId)
}

const getAssignmentsByMember = async (memberId: string): Promise<AssignmentRow[]> => {
  if (isGreenhousePostgresConfigured()) {
    try {
      return await getAssignmentsByMemberFromPostgres(memberId)
    } catch (error) {
      if (!shouldFallbackToLegacy(error)) throw error
      console.warn('[people/detail] assignments Postgres failed, falling back:', error instanceof Error ? error.message : error)
    }
  }

  return getAssignmentsByMemberFromBigQuery(memberId)
}

const getIdentityProvidersByProfile = async (identityProfileId: string | null): Promise<IdentitySourceRow[]> => {
  if (!identityProfileId) return []

  if (isGreenhousePostgresConfigured()) {
    try {
      return await getIdentityProvidersByProfileFromPostgres(identityProfileId)
    } catch (error) {
      if (!shouldFallbackToLegacy(error)) throw error
      console.warn('[people/detail] identity links Postgres failed, falling back:', error instanceof Error ? error.message : error)
    }
  }

  return getIdentityProvidersByProfileFromBigQuery(identityProfileId)
}

/**
 * @deprecated For new consumers, use `getPersonComplete360(identifier, { facets: [...] })`
 * from `@/lib/person-360/person-complete-360` instead. The federated 360 resolver provides
 * unified identity resolution, per-facet authorization, caching, and observability (TASK-273).
 * This function remains in use by the People Detail view until its incremental migration.
 */
export const getPersonDetail = async ({
  memberId: memberIdOrEoId,
  access,
  organizationId
}: {
  memberId: string
  access: PersonAccess
  organizationId?: string | null
}): Promise<PersonDetail> => {
  // Resolve identifier via person_360 — works with EO-ID or legacy memberId
  const resolved = await resolvePersonIdentifier(memberIdOrEoId)
  const memberId = resolved?.memberId ?? memberIdOrEoId
  const scopedOrganizationId = organizationId?.trim() || null

  const memberRow = await getMemberById(memberId)

  if (!memberRow) {
    throw new PeopleValidationError('Person not found.', 404, { memberId })
  }

  const { member, emailAliases } = buildPersonMember(memberRow)

  // Set canonical EO-ID and linked userId from person_360
  if (resolved) {
    member.eoId = resolved.eoId
  }

  const identityRows = await getIdentityProvidersByProfile(member.identityProfileId)

  const linkedProviders = Array.from(
    new Set(
      identityRows
        .map(row => mapIdentityProvider(row.source_system))
        .filter(Boolean) as TeamIdentityProvider[]
    )
  ).sort((left, right) => left.localeCompare(right))

  const { identityMatchSignals, notionUserCandidates } = buildIdentityMatchPayload({
    notionUserId: member.notionUserId,
    identityRows
  })

  const detail: PersonDetail = {
    member,
    access,
    summary: {
      activeAssignments: 0,
      contractedFte: 1,
      assignedFte: 0,
      totalFte: 0,
      totalHoursMonth: 0
    },
    integrations: buildIntegrations({
      providers: linkedProviders,
      notionUserId: member.notionUserId,
      azureOid: member.azureOid,
      hubspotOwnerId: member.hubspotOwnerId,
      identityConfidence: getIdentityConfidence({
        providers: linkedProviders,
        identityProfileId: member.identityProfileId,
        emailAliases
      })
    })
  }

  const tasks: Array<Promise<void>> = []

  // linkedUserId already resolved from person_360
  detail.linkedUserId = resolved?.userId ?? null

  // Canonical capacity snapshot — single source of truth per GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1
  let capacitySnapshot: MemberCapacityEconomicsSnapshot | null = null
  let intelligence: PersonIntelligenceSnapshot | null = null
  let scopedClientIds: Set<string> | null = null

  if (scopedOrganizationId) {
    try {
      scopedClientIds = new Set(await getOrganizationClientIds(scopedOrganizationId))
    } catch (error) {
      console.warn(`[people/${memberId}] organization client scope failed:`, error instanceof Error ? error.message : error)
    }
  }

  if (isGreenhousePostgresConfigured() && !scopedOrganizationId) {
    tasks.push(
      readLatestMemberCapacityEconomicsSnapshot(memberId).then(snap => {
        capacitySnapshot = snap

        if (snap) {
          detail.summary = {
            activeAssignments: snap.assignmentCount,
            contractedFte: roundToTenths(snap.contractedFte),
            assignedFte: roundToTenths(snap.assignedHours / 160),
            totalFte: roundToTenths(snap.assignedHours / 160),
            totalHoursMonth: snap.assignedHours
          }
        }
      }).catch(error => {
        console.warn(`[people/${memberId}] capacity snapshot failed:`, error instanceof Error ? error.message : error)
      })
    )

    tasks.push(
      (async () => {
        try {
          const now = new Date()

          intelligence = await readPersonIntelligence(memberId, now.getFullYear(), now.getMonth() + 1)
        } catch (error) {
          console.warn(`[people/${memberId}] person intelligence failed:`, error instanceof Error ? error.message : error)
        }
      })()
    )
  }

  // Assignments raw — only for the expandable detail table, not for FTE/capacity derivation
  tasks.push(
    (async () => {
      const rows = await getAssignmentsByMember(memberId)

      // If no capacity snapshot was loaded, fall back to assignment-derived summary
      if (!capacitySnapshot) {
        let summaryClientIds = scopedClientIds

        if (!summaryClientIds && member.identityProfileId) {
          try {
            const memberships = await getPersonMemberships(member.identityProfileId)

            summaryClientIds = new Set(memberships.map(m => m.clientId).filter(Boolean) as string[])
          } catch {
            // If memberships lookup fails, fall back to all assignments
          }
        }

        const summaryRows = summaryClientIds
          ? rows.filter(r => summaryClientIds.has(String(r.client_id || '')))
          : rows

        detail.summary = buildAssignmentsSummary(summaryRows)
      }

      if (access.canViewAssignments) {
        const visibleRows = scopedClientIds
          ? rows.filter(r => scopedClientIds!.has(String(r.client_id || '')))
          : rows

        detail.assignments = normalizeAssignments(visibleRows)
      }
    })().catch(error => {
      console.warn(`[people/${memberId}] assignments failed:`, error instanceof Error ? error.message : error)
    })
  )

  if (access.canViewActivity && !scopedOrganizationId) {
    // Operational metrics: prefer person_intelligence serving, raw from notion_ops as fallback.
    // The intelligence snapshot is loaded above in a parallel task; raw only fires if serving unavailable.
    tasks.push(
      getPersonOperationalMetrics({
        displayName: member.displayName,
        notionUserId: member.notionUserId,
        publicEmail: member.publicEmail,
        internalEmail: member.internalEmail,
        emailAliases,
        identityMatchSignals,
        notionUserCandidates
      }).then(metrics => {
        // Will be overridden by serving data after Promise.all if intelligence exists
        detail.operationalMetrics = metrics
      }).catch(error => {
        console.warn(`[people/${memberId}] operational metrics failed:`, error instanceof Error ? error.message : error)
      })
    )
  }

  if (access.canViewCompensation || access.canViewPayroll) {
    tasks.push(
      getMemberPayrollHistory(memberId).then(history => {
        if (access.canViewCompensation) {
          detail.currentCompensation = getCurrentCompensationFromHistory(history.compensationHistory)
        }

        if (access.canViewPayroll) {
          detail.recentPayroll = history.entries.slice(0, 3)
        }
      }).catch(error => {
        console.warn(`[people/${memberId}] payroll history failed:`, error instanceof Error ? error.message : error)
      })
    )
  }

  if (access.canViewFinance) {
    tasks.push(
      getPersonFinanceOverview(memberId, { organizationId: scopedOrganizationId }).then(finance => {
        detail.financeSummary = finance.summary
      }).catch(error => {
        console.warn(`[people/${memberId}] finance overview failed:`, error instanceof Error ? error.message : error)
      })
    )
  }

  // Person 360 contextual enrichment (Postgres-only)
  if (isGreenhousePostgresConfigured()) {
    if (access.canViewIdentityContext || access.canViewAccessContext) {
      tasks.push(
        (resolved?.eoId ? getPersonProfileByEoId(resolved.eoId) : getPersonProfileByMemberId(memberId)).then(profile => {
          if (!profile) {
            return
          }

          if (access.canViewIdentityContext) {
            detail.identityContext = buildPersonIdentityContext(profile, detail.linkedUserId ?? null)
          }

          if (access.canViewAccessContext) {
            detail.accessContext = buildPersonAccessContext(profile)
          }
        }).catch(error => {
          console.warn(`[people/${memberId}] person_360 context failed:`, error instanceof Error ? error.message : error)
        })
      )
    }

    if (access.canViewActivity) {
      tasks.push(
        getPersonDeliveryContext(memberId, { organizationId: scopedOrganizationId }).then(ctx => {
          detail.deliveryContext = ctx
        }).catch(error => {
          console.warn(`[people/${memberId}] delivery context failed:`, error instanceof Error ? error.message : error)
        })
      )
    }

    if (access.canViewHrProfile) {
      tasks.push(
        getPersonHrContext(memberId).then(ctx => {
          detail.hrContext = ctx
        }).catch(error => {
          console.warn(`[people/${memberId}] hr context failed:`, error instanceof Error ? error.message : error)
        })
      )
    }
  }

  await Promise.all(tasks)

  // After Promise.all, the async callbacks may have mutated these closures
  const resolvedIntelligence = intelligence as PersonIntelligenceSnapshot | null
  const resolvedSnapshot = capacitySnapshot as MemberCapacityEconomicsSnapshot | null

  // Override operational metrics from serving if person_intelligence exists
  if (resolvedIntelligence && access.canViewActivity) {
    const throughput = resolvedIntelligence.deliveryMetrics.find(m => m.metricId === 'throughput')
    const rpa = resolvedIntelligence.deliveryMetrics.find(m => m.metricId === 'rpa')
    const otd = resolvedIntelligence.deliveryMetrics.find(m => m.metricId === 'otd_pct')

    detail.operationalMetrics = {
      rpaAvg30d: rpa?.value ?? detail.operationalMetrics?.rpaAvg30d ?? null,
      otdPercent30d: otd?.value ?? detail.operationalMetrics?.otdPercent30d ?? null,
      tasksCompleted30d: throughput?.value ?? detail.operationalMetrics?.tasksCompleted30d ?? 0,
      tasksActiveNow: resolvedIntelligence.capacity.activeAssignmentCount ?? detail.operationalMetrics?.tasksActiveNow ?? 0,
      projectBreakdown: detail.operationalMetrics?.projectBreakdown ?? []
    }
  }

  if (access.canViewActivity || access.canViewAssignments) {
    if (resolvedSnapshot) {
      detail.capacity = buildCapacityFromSnapshot(resolvedSnapshot, resolvedIntelligence)
    }
  }

  return detail
}
