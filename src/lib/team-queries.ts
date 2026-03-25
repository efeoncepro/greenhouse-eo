import 'server-only'

import { buildAccountTeam } from '@/lib/dashboard/tenant-dashboard-overrides'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  clampPercent,
  getAssignedHoursMonth,
  getCapacityHealth,
  getExpectedMonthlyThroughput,
  getUtilizationPercent,
  roundToTenths
} from '@/lib/team-capacity/shared'
import type {
  TeamByProjectMember,
  TeamByProjectPayload,
  TeamBySprintMember,
  TeamBySprintPayload,
  TeamCapacityMember,
  TeamCapacityPayload,
  TeamContactChannel,
  TeamDataSource,
  TeamIdentityConfidence,
  TeamIdentityProvider,
  TeamMemberProfile,
  TeamMemberResponse,
  TeamMembersPayload,
  TeamRoleCategory
} from '@/types/team'

type TeamQueryViewer = {
  clientId: string
  projectIds: string[]
  businessLines: string[]
  serviceModules: string[]
}

type TeamAssignmentRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  avatar_url: string | null
  role_title: string | null
  role_category: string | null
  relevance_note: string | null
  contact_channel: string | null
  contact_handle: string | null
  fte_allocation: number | string | null
  start_date: { value?: string } | string | null
  notion_display_name: string | null
  notion_user_id: string | null
  identity_profile_id: string | null
  email_aliases: string[] | null
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

type TeamAssignment = {
  memberId: string
  displayName: string
  email: string
  avatarUrl: string | null
  roleTitle: string
  roleCategory: TeamRoleCategory
  relevanceNote: string | null
  contactChannel: TeamContactChannel
  contactHandle: string | null
  fteAllocation: number
  startDate: string | null
  notionDisplayName: string | null
  notionUserId: string | null
  identityProfileId: string | null
  emailAliases: string[]
  azureOid: string | null
  hubspotOwnerId: string | null
  profile: TeamMemberProfile
  identityProviders: TeamIdentityProvider[]
  identityConfidence: TeamIdentityConfidence
  identityMatchSignals: string[]
}

type TeamIdentitySourceRow = {
  profile_id: string | null
  source_system: string | null
  source_object_type: string | null
  source_object_id: string | null
  source_user_id: string | null
  source_email: string | null
  source_display_name: string | null
  is_login_identity: boolean | null
}

type OperationalLoadRow = {
  responsable_nombre: string | null
  responsable_email: string | null
  responsable_notion_id: string | null
  total_assets: number | string | null
  active_assets: number | string | null
  completed_assets: number | string | null
  avg_rpa: number | string | null
  project_count: number | string | null
}

type ProjectBreakdownRow = {
  responsable_nombre: string | null
  responsable_email: string | null
  responsable_notion_id: string | null
  project_id: string | null
  project_name: string | null
  asset_count: number | string | null
  active_count: number | string | null
}

type ProjectTeamRow = {
  responsable_nombre: string | null
  responsable_email: string | null
  responsable_notion_id: string | null
  total_assets: number | string | null
  active_assets: number | string | null
  completed_assets: number | string | null
  avg_rpa: number | string | null
  in_review: number | string | null
  changes_requested: number | string | null
}

type SprintContextRow = {
  notion_page_id: string | null
  sprint_name: string | null
  sprint_status: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  total_tasks: number | string | null
  completed_tasks: number | string | null
}

type SprintTeamRow = {
  responsable_nombre: string | null
  responsable_email: string | null
  responsable_notion_id: string | null
  total_in_sprint: number | string | null
  completed: number | string | null
  pending: number | string | null
  avg_rpa: number | string | null
}

const roleOrder: Record<TeamRoleCategory, number> = {
  account: 1,
  operations: 2,
  strategy: 3,
  design: 4,
  development: 5,
  media: 6,
  unknown: 7
}

const completedStatuses = ['Listo', 'Done', 'Finalizado', 'Completado']
const inactiveStatuses = [...completedStatuses, 'Cancelado', 'Cancelada', 'Cancelled', 'Canceled']

const periodFormatter = new Intl.DateTimeFormat('es-CL', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Santiago'
})

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toDateString = (value: { value?: string } | string | null) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  return typeof value.value === 'string' ? value.value.slice(0, 10) : null
}

const toStringArray = (value: string[] | null | undefined) =>
  Array.isArray(value)
    ? value
        .map(item => String(item || '').trim())
        .filter(Boolean)
    : []

const getMonthDiffFromDate = (value: string | null) => {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const now = new Date()
  let months = (now.getUTCFullYear() - date.getUTCFullYear()) * 12 + (now.getUTCMonth() - date.getUTCMonth())

  if (now.getUTCDate() < date.getUTCDate()) {
    months -= 1
  }

  return Math.max(0, months)
}

const getAgeYearsFromDate = (value: string | null) => {
  const months = getMonthDiffFromDate(value)

  return months === null ? null : Math.floor(months / 12)
}

const getProfileCompletenessPercent = (profile: Omit<TeamMemberProfile, 'profileCompletenessPercent'>) => {
  const checks = [
    profile.firstName,
    profile.lastName,
    profile.orgRoleId,
    profile.professionId,
    profile.seniorityLevel,
    profile.phone,
    profile.locationCity,
    profile.locationCountry,
    profile.timeZone,
    profile.yearsExperience,
    profile.efeonceStartDate,
    profile.teamsUserId || profile.slackUserId,
    profile.languages.length > 0 ? 'languages' : null
  ]

  const populatedCount = checks.filter(value => {
    if (typeof value === 'number') {
      return Number.isFinite(value)
    }

    return Boolean(value)
  }).length

  return clampPercent((populatedCount / checks.length) * 100)
}

const normalizeMatchValue = (value: string | null | undefined) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\|/g, ' ')
    .replace(/[^a-z0-9@._\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const inferRoleCategory = (value: string | null | undefined): TeamRoleCategory => {
  const normalized = normalizeMatchValue(value)

  if (normalized.includes('account')) return 'account'
  if (normalized.includes('operat')) return 'operations'
  if (normalized.includes('strateg')) return 'strategy'
  if (normalized.includes('design') || normalized.includes('creative')) return 'design'
  if (normalized.includes('develop') || normalized.includes('web')) return 'development'
  if (normalized.includes('media')) return 'media'

  return 'unknown'
}

const toContactChannel = (value: string | null | undefined): TeamContactChannel => {
  if (value === 'slack' || value === 'email') {
    return value
  }

  return 'teams'
}

const mapIdentityProvider = (sourceSystem: string | null | undefined): TeamIdentityProvider | null => {
  const normalized = normalizeMatchValue(sourceSystem)

  if (normalized === 'notion') return 'notion'
  if (normalized === 'hubspot_crm' || normalized === 'hubspot') return 'hubspot'

  if (normalized === 'azure_ad' || normalized === 'microsoft' || normalized === 'microsoft_sso') {
    return 'microsoft'
  }

  if (normalized === 'google' || normalized === 'google_oauth' || normalized === 'google_workspace') {
    return 'google'
  }

  if (normalized === 'deel' || normalized === 'deel_hr' || normalized === 'deel_com') {
    return 'deel'
  }

  return null
}

const getIdentityConfidence = ({
  providers,
  identityProfileId,
  emailAliases
}: {
  providers: TeamIdentityProvider[]
  identityProfileId: string | null
  emailAliases: string[]
}): TeamIdentityConfidence => {
  if (identityProfileId && (providers.length >= 2 || (providers.length >= 1 && emailAliases.length > 0))) {
    return 'strong'
  }

  if (identityProfileId || providers.length >= 1 || emailAliases.length > 0) {
    return 'partial'
  }

  return 'basic'
}

const sortAssignments = <T extends { roleCategory: TeamRoleCategory; displayName: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const roleDelta = roleOrder[left.roleCategory] - roleOrder[right.roleCategory]

    return roleDelta !== 0 ? roleDelta : left.displayName.localeCompare(right.displayName, 'es')
  })

const createEmptyProfile = (overrides: Partial<Omit<TeamMemberProfile, 'profileCompletenessPercent'>> = {}): TeamMemberProfile => {
  const baseProfile: Omit<TeamMemberProfile, 'profileCompletenessPercent'> = {
    firstName: null,
    lastName: null,
    preferredName: null,
    legalName: null,
    orgRoleId: null,
    orgRoleName: null,
    professionId: null,
    professionName: null,
    seniorityLevel: null,
    employmentType: null,
    ageYears: null,
    phone: null,
    teamsUserId: null,
    slackUserId: null,
    locationCity: null,
    locationCountry: null,
    timeZone: null,
    yearsExperience: null,
    efeonceStartDate: null,
    tenureEfeonceMonths: null,
    tenureClientMonths: null,
    biography: null,
    languages: []
  }

  const profile = {
    ...baseProfile,
    ...overrides
  }

  return {
    ...profile,
    profileCompletenessPercent: getProfileCompletenessPercent(profile)
  }
}

const toLegacyMemberResponse = (viewer: TeamQueryViewer): TeamMembersPayload => {
  const legacy = buildAccountTeam(viewer.clientId, [])

  const members: TeamMemberResponse[] = legacy.members.map(member => ({
    memberId: member.id,
    displayName: member.name,
    email: '',
    avatarUrl: member.avatarPath || null,
    roleTitle: member.role,
    roleCategory: inferRoleCategory(member.role),
    relevanceNote: null,
    contactChannel: 'teams',
    contactHandle: null,
    fteAllocation: roundToTenths((member.monthlyHours || 0) / 160),
    startDate: null,
    profile: createEmptyProfile(),
    identityProviders: [],
    identityConfidence: 'basic'
  }))

  return {
    members: sortAssignments(members),
    footer: {
      serviceLines: viewer.businessLines,
      modality: viewer.serviceModules.length > 0 ? 'On-Going' : null,
      totalFte: roundToTenths(legacy.totalMonthlyHours / 160)
    },
    source: 'legacy_override'
  }
}

const toCapacityFallback = (viewer: TeamQueryViewer): TeamCapacityPayload => {
  const legacy = buildAccountTeam(viewer.clientId, [])
  const legacyMembers = toLegacyMemberResponse(viewer)
  const totalHoursMonth = Math.round(legacyMembers.footer.totalFte * 160)
  const utilizationPercent = clampPercent(legacy.averageAllocationPct || 0)

  const members: TeamCapacityMember[] = []

  for (const member of legacyMembers.members) {
    const assignedHoursMonth = getAssignedHoursMonth(member.fteAllocation)

    const expectedMonthlyThroughput = getExpectedMonthlyThroughput({
      roleCategory: member.roleCategory,
      fteAllocation: member.fteAllocation
    })

    const memberUtilizationPercent = 0

    members.push({
      memberId: member.memberId,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      roleTitle: member.roleTitle,
      roleCategory: member.roleCategory,
      identityProviders: member.identityProviders,
      identityConfidence: member.identityConfidence,
      fteAllocation: member.fteAllocation,
      assignedHoursMonth,
      expectedMonthlyThroughput,
      utilizationPercent: memberUtilizationPercent,
      capacityHealth: getCapacityHealth(memberUtilizationPercent),
      activeAssets: 0,
      completedAssets: 0,
      avgRpa: null,
      projectCount: 0,
      projectBreakdown: []
    })
  }

  const activeAssets = members.reduce((sum, member) => sum + member.activeAssets, 0)
  const completedAssets = members.reduce((sum, member) => sum + member.completedAssets, 0)
  const expectedMonthlyThroughput = roundToTenths(members.reduce((sum, member) => sum + member.expectedMonthlyThroughput, 0))
  const healthBuckets = buildHealthBuckets(members)

  return {
    summary: {
      totalFte: legacyMembers.footer.totalFte,
      totalHoursMonth,
      assignedHoursMonth: totalHoursMonth,
      utilizedHoursMonth: Math.round((totalHoursMonth * utilizationPercent) / 100),
      utilizationPercent,
      memberCount: members.length,
      activeAssets,
      completedAssets,
      expectedMonthlyThroughput,
      healthBuckets
    },
    members,
    roleBreakdown: buildRoleBreakdown(members),
    period: periodFormatter.format(new Date()),
    source: 'legacy_override',
    hasOperationalMetrics: false
  }
}

const createSyntheticMemberId = (displayName: string, email: string | null) => {
  const base = normalizeMatchValue(email || displayName).replace(/[^a-z0-9]+/g, '-')

  return base ? `team-${base}` : 'team-unknown'
}

const isMissingBigQueryEntityError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : ''

  return code === '404' || /not found: table/i.test(message) || /dataset .* was not found/i.test(message)
}

const runQuery = async <T>(query: string, params: Record<string, unknown>) => {
  const [rows] = await getBigQueryClient().query({
    query,
    params
  })

  return rows as T[]
}

const getTableColumns = async (dataset: string, tableName: string) => {
  const projectId = getBigQueryProjectId()

  try {
    const rows = await runQuery<{ column_name: string | null }>(
      `
        SELECT column_name
        FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = @tableName
      `,
      { tableName }
    )

    return new Set(rows.map(row => row.column_name || '').filter(Boolean))
  } catch (error) {
    if (isMissingBigQueryEntityError(error)) {
      return new Set<string>()
    }

    throw error
  }
}

const getOptionalStringSelect = (columns: Set<string>, columnName: string, expression = `m.${columnName}`) =>
  columns.has(columnName) ? `${expression} AS ${columnName},` : `CAST(NULL AS STRING) AS ${columnName},`

const getOptionalDateSelect = (columns: Set<string>, columnName: string, expression = `m.${columnName}`) =>
  columns.has(columnName) ? `${expression} AS ${columnName},` : `CAST(NULL AS DATE) AS ${columnName},`

const getOptionalNumberSelect = (columns: Set<string>, columnName: string, expression = `m.${columnName}`) =>
  columns.has(columnName) ? `${expression} AS ${columnName},` : `CAST(NULL AS FLOAT64) AS ${columnName},`

const getOptionalArrayStringSelect = (columns: Set<string>, columnName: string, expression = `m.${columnName}`) =>
  columns.has(columnName) ? `COALESCE(${expression}, ARRAY<STRING>[]) AS ${columnName},` : `ARRAY<STRING>[] AS ${columnName},`

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

const getAssignmentRowsFromBigQuery = async (clientId: string) => {
  const projectId = getBigQueryProjectId()
  const memberColumns = await getTableColumns('greenhouse', 'team_members')
  const roleCatalogColumns = await getTableColumns('greenhouse', 'team_role_catalog')
  const professionCatalogColumns = await getTableColumns('greenhouse', 'team_profession_catalog')

  const identityProfileSelect = memberColumns.has('identity_profile_id')
    ? 'm.identity_profile_id,'
    : 'CAST(NULL AS STRING) AS identity_profile_id,'

  const emailAliasesSelect = memberColumns.has('email_aliases')
    ? 'COALESCE(m.email_aliases, ARRAY<STRING>[]) AS email_aliases,'
    : 'ARRAY<STRING>[] AS email_aliases,'

  const canJoinRoleCatalog = memberColumns.has('org_role_id') && roleCatalogColumns.size > 0
  const canJoinProfessionCatalog = memberColumns.has('profession_id') && professionCatalogColumns.size > 0

  return runQuery<TeamAssignmentRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.email,
        m.avatar_url,
        COALESCE(a.role_title_override, m.role_title) AS role_title,
        m.role_category,
        COALESCE(a.relevance_note_override, m.relevance_note) AS relevance_note,
        COALESCE(a.contact_channel_override, m.contact_channel) AS contact_channel,
        COALESCE(a.contact_handle_override, m.contact_handle) AS contact_handle,
        a.fte_allocation,
        a.start_date,
        m.notion_display_name,
        m.notion_user_id,
        ${identityProfileSelect}
        ${emailAliasesSelect}
        m.azure_oid,
        m.hubspot_owner_id,
        ${getOptionalStringSelect(memberColumns, 'first_name')}
        ${getOptionalStringSelect(memberColumns, 'last_name')}
        ${getOptionalStringSelect(memberColumns, 'preferred_name')}
        ${getOptionalStringSelect(memberColumns, 'legal_name')}
        ${getOptionalStringSelect(memberColumns, 'org_role_id')}
        ${canJoinRoleCatalog ? 'rc.role_name AS org_role_name,' : 'CAST(NULL AS STRING) AS org_role_name,'}
        ${getOptionalStringSelect(memberColumns, 'profession_id')}
        ${canJoinProfessionCatalog ? 'pc.profession_name AS profession_name,' : 'CAST(NULL AS STRING) AS profession_name,'}
        ${getOptionalStringSelect(memberColumns, 'seniority_level')}
        ${getOptionalStringSelect(memberColumns, 'employment_type')}
        ${getOptionalDateSelect(memberColumns, 'birth_date')}
        ${getOptionalStringSelect(memberColumns, 'phone')}
        ${getOptionalStringSelect(memberColumns, 'teams_user_id')}
        ${getOptionalStringSelect(memberColumns, 'slack_user_id')}
        ${getOptionalStringSelect(memberColumns, 'location_city')}
        ${getOptionalStringSelect(memberColumns, 'location_country')}
        ${getOptionalStringSelect(memberColumns, 'time_zone')}
        ${getOptionalNumberSelect(memberColumns, 'years_experience')}
        ${getOptionalDateSelect(memberColumns, 'efeonce_start_date')}
        ${getOptionalStringSelect(memberColumns, 'biography')}
        ${getOptionalArrayStringSelect(memberColumns, 'languages')}
      FROM \`${projectId}.greenhouse.client_team_assignments\` AS a
      INNER JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = a.member_id
      ${canJoinRoleCatalog ? `LEFT JOIN \`${projectId}.greenhouse.team_role_catalog\` AS rc ON rc.role_id = m.org_role_id AND rc.active = TRUE` : ''}
      ${canJoinProfessionCatalog ? `LEFT JOIN \`${projectId}.greenhouse.team_profession_catalog\` AS pc ON pc.profession_id = m.profession_id AND pc.active = TRUE` : ''}
      WHERE a.client_id = @clientId
        AND a.active = TRUE
        AND m.active = TRUE
        AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE())
      ORDER BY
        CASE m.role_category
          WHEN 'account' THEN 1
          WHEN 'operations' THEN 2
          WHEN 'strategy' THEN 3
          WHEN 'design' THEN 4
          WHEN 'development' THEN 5
          WHEN 'media' THEN 6
          ELSE 7
        END,
        m.display_name
    `,
    { clientId }
  )
}

const getAssignmentRows = async (clientId: string) => {
  if (isGreenhousePostgresConfigured()) {
    try {
      const rows = await runGreenhousePostgresQuery<TeamAssignmentRow>(
        `SELECT
           m.member_id,
           m.display_name,
           m.primary_email AS email,
           m.avatar_url,
           COALESCE(a.role_title_override, m.role_title) AS role_title,
           m.role_category,
           COALESCE(a.relevance_note_override, m.relevance_note) AS relevance_note,
           COALESCE(a.contact_channel_override, m.contact_channel) AS contact_channel,
           COALESCE(a.contact_handle_override, m.contact_handle) AS contact_handle,
           a.fte_allocation,
           a.start_date::text AS start_date,
           m.notion_display_name,
           m.notion_user_id,
           m.identity_profile_id,
           COALESCE(m.email_aliases, ARRAY[]::text[]) AS email_aliases,
           m.azure_oid,
           m.hubspot_owner_id,
           m.first_name,
           m.last_name,
           m.preferred_name,
           m.legal_name,
           m.org_role_id,
           NULL::text AS org_role_name,
           m.profession_id,
           NULL::text AS profession_name,
           m.seniority_level,
           m.employment_type,
           m.birth_date::text AS birth_date,
           m.phone,
           m.teams_user_id,
           m.slack_user_id,
           m.location_city,
           m.location_country,
           m.time_zone,
           m.years_experience,
           m.efeonce_start_date::text AS efeonce_start_date,
           m.biography,
           COALESCE(m.languages, ARRAY[]::text[]) AS languages
         FROM greenhouse_core.client_team_assignments AS a
         INNER JOIN greenhouse_core.members AS m ON m.member_id = a.member_id
         WHERE a.client_id = $1
           AND a.active = TRUE
           AND m.active = TRUE
           AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
         ORDER BY
           CASE m.role_category
             WHEN 'account' THEN 1
             WHEN 'operations' THEN 2
             WHEN 'strategy' THEN 3
             WHEN 'design' THEN 4
             WHEN 'development' THEN 5
             WHEN 'media' THEN 6
             ELSE 7
           END,
           m.display_name`,
        [clientId]
      )

      return rows
    } catch (error) {
      if (!shouldFallbackToLegacy(error)) throw error
      console.warn('[team-queries] getAssignmentRows Postgres failed, falling back to BigQuery:', error instanceof Error ? error.message : error)
    }
  }

  return getAssignmentRowsFromBigQuery(clientId)
}

const toAssignments = (rows: TeamAssignmentRow[]): TeamAssignment[] =>
  rows.map(row => {
    const startDate = toDateString(row.start_date)
    const birthDate = toDateString(row.birth_date)
    const efeonceStartDate = toDateString(row.efeonce_start_date)

    const profile = createEmptyProfile({
      firstName: row.first_name || null,
      lastName: row.last_name || null,
      preferredName: row.preferred_name || null,
      legalName: row.legal_name || null,
      orgRoleId: row.org_role_id || null,
      orgRoleName: row.org_role_name || null,
      professionId: row.profession_id || null,
      professionName: row.profession_name || null,
      seniorityLevel: row.seniority_level || null,
      employmentType: row.employment_type || null,
      ageYears: getAgeYearsFromDate(birthDate),
      phone: row.phone || null,
      teamsUserId: row.teams_user_id || null,
      slackUserId: row.slack_user_id || null,
      locationCity: row.location_city || null,
      locationCountry: row.location_country || null,
      timeZone: row.time_zone || null,
      yearsExperience: toNullableNumber(row.years_experience),
      efeonceStartDate,
      tenureEfeonceMonths: getMonthDiffFromDate(efeonceStartDate),
      tenureClientMonths: getMonthDiffFromDate(startDate),
      biography: row.biography || null,
      languages: toStringArray(row.languages)
    })

    return {
      memberId: row.member_id || createSyntheticMemberId(row.display_name || '', row.email),
      displayName: row.display_name || row.email || 'Efeonce Team',
      email: row.email || '',
      avatarUrl: row.avatar_url || null,
      roleTitle: row.role_title || profile.orgRoleName || 'Efeonce Team',
      roleCategory: inferRoleCategory(row.role_category || row.role_title || profile.professionName),
      relevanceNote: row.relevance_note || null,
      contactChannel: toContactChannel(row.contact_channel),
      contactHandle: row.contact_handle || null,
      fteAllocation: roundToTenths(toNumber(row.fte_allocation)),
      startDate,
      notionDisplayName: row.notion_display_name || null,
      notionUserId: row.notion_user_id || null,
      identityProfileId: row.identity_profile_id || null,
      emailAliases: Array.isArray(row.email_aliases) ? row.email_aliases.filter(Boolean) : [],
      azureOid: row.azure_oid || null,
      hubspotOwnerId: row.hubspot_owner_id || null,
      profile,
      identityProviders: [],
      identityConfidence: 'basic',
      identityMatchSignals: []
    }
  })

const getIdentitySourceRowsFromBigQuery = async (profileIds: string[]) => {
  const projectId = getBigQueryProjectId()

  try {
    return await runQuery<TeamIdentitySourceRow>(
      `
        SELECT
          profile_id,
          source_system,
          source_object_type,
          source_object_id,
          source_user_id,
          source_email,
          source_display_name,
          is_login_identity
        FROM \`${projectId}.greenhouse.identity_profile_source_links\`
        WHERE active = TRUE
          AND profile_id IN UNNEST(@profileIds)
      `,
      { profileIds }
    )
  } catch (error) {
    if (isMissingBigQueryEntityError(error)) {
      return [] as TeamIdentitySourceRow[]
    }

    throw error
  }
}

const getIdentitySourceRows = async (profileIds: string[]) => {
  if (profileIds.length === 0) {
    return [] as TeamIdentitySourceRow[]
  }

  if (isGreenhousePostgresConfigured()) {
    try {
      const rows = await runGreenhousePostgresQuery<TeamIdentitySourceRow>(
        `SELECT
           profile_id,
           source_system,
           source_object_type,
           source_object_id,
           source_user_id,
           source_email,
           source_display_name,
           is_login_identity
         FROM greenhouse_core.identity_profile_source_links
         WHERE active = TRUE
           AND profile_id = ANY($1)`,
        [profileIds]
      )

      return rows
    } catch (error) {
      if (!shouldFallbackToLegacy(error)) throw error
      console.warn('[team-queries] getIdentitySourceRows Postgres failed, falling back to BigQuery:', error instanceof Error ? error.message : error)
    }
  }

  return getIdentitySourceRowsFromBigQuery(profileIds)
}

const enrichAssignmentsWithIdentity = async (assignments: TeamAssignment[]) => {
  const profileIds = assignments.map(assignment => assignment.identityProfileId).filter(Boolean) as string[]
  const identityRows = await getIdentitySourceRows(profileIds)
  const identityRowsByProfile = new Map<string, TeamIdentitySourceRow[]>()

  for (const row of identityRows) {
    if (!row.profile_id) {
      continue
    }

    const current = identityRowsByProfile.get(row.profile_id) || []

    current.push(row)
    identityRowsByProfile.set(row.profile_id, current)
  }

  return assignments.map(assignment => {
    const linkedRows = assignment.identityProfileId ? identityRowsByProfile.get(assignment.identityProfileId) || [] : []
    const providers = new Set<TeamIdentityProvider>()
    const identityMatchSignals = new Set<string>()

    if (assignment.notionUserId) providers.add('notion')
    if (assignment.azureOid) providers.add('microsoft')
    if (assignment.hubspotOwnerId) providers.add('hubspot')

    ;[
      assignment.identityProfileId,
      assignment.notionUserId,
      assignment.azureOid,
      assignment.hubspotOwnerId,
      assignment.email,
      assignment.notionDisplayName,
      assignment.displayName,
      ...assignment.emailAliases
    ].forEach(value => {
      const normalized = normalizeMatchValue(value)

      if (normalized) {
        identityMatchSignals.add(normalized)
      }
    })

    for (const row of linkedRows) {
      const provider = mapIdentityProvider(row.source_system)

      if (provider) {
        providers.add(provider)
      }

      ;[row.source_object_id, row.source_user_id, row.source_email, row.source_display_name].forEach(value => {
        const normalized = normalizeMatchValue(value)

        if (normalized) {
          identityMatchSignals.add(normalized)
        }
      })
    }

    const identityProviders = Array.from(providers)

    return {
      ...assignment,
      identityProviders,
      identityConfidence: getIdentityConfidence({
        providers: identityProviders,
        identityProfileId: assignment.identityProfileId,
        emailAliases: assignment.emailAliases
      }),
      identityMatchSignals: Array.from(identityMatchSignals)
    }
  })
}

const buildLookup = (assignments: TeamAssignment[]) => {
  const lookup = new Map<string, TeamAssignment>()

  for (const assignment of assignments) {
    const keys = [
      assignment.notionUserId,
      assignment.email,
      assignment.notionDisplayName,
      assignment.displayName,
      ...assignment.emailAliases,
      ...assignment.identityMatchSignals
    ]

    for (const key of keys) {
      const normalized = normalizeMatchValue(key)

      if (normalized && !lookup.has(normalized)) {
        lookup.set(normalized, assignment)
      }
    }
  }

  return lookup
}

const matchAssignment = (
  lookup: Map<string, TeamAssignment>,
  signal: { responsableNombre: string | null; responsableEmail: string | null; responsableNotionId: string | null }
) => {
  const keys = [signal.responsableNotionId, signal.responsableEmail, signal.responsableNombre]

  for (const key of keys) {
    const normalized = normalizeMatchValue(key)

    if (normalized && lookup.has(normalized)) {
      return lookup.get(normalized) || null
    }
  }

  return null
}

const getOperationalColumns = async () => getTableColumns('notion_ops', 'tareas')

const hasOperationalColumns = (columns: Set<string>) => columns.has('responsables_names') || columns.has('responsable_texto')

const buildResponsableSignals = (columns: Set<string>) => {
  const responsableNombreExpr = columns.has('responsables_names')
    ? columns.has('responsable_texto')
      ? 'COALESCE(t.responsables_names[SAFE_OFFSET(0)], t.responsable_texto)'
      : 't.responsables_names[SAFE_OFFSET(0)]'
    : 't.responsable_texto'

  const responsableEmailSelect = 'CAST(NULL AS STRING) AS responsable_email,'

  const responsableNotionIdSelect = columns.has('responsables_ids')
    ? 't.responsables_ids[SAFE_OFFSET(0)] AS responsable_notion_id,'
    : 'CAST(NULL AS STRING) AS responsable_notion_id,'

  return {
    responsableNombreExpr,
    responsableNombreSelect: `${responsableNombreExpr} AS responsable_nombre,`,
    responsableEmailSelect,
    responsableNotionIdSelect
  }
}

const getOperationalLoadRows = async (projectIds: string[], columns: Set<string>) => {
  if (projectIds.length === 0 || !hasOperationalColumns(columns)) {
    return [] as OperationalLoadRow[]
  }

  const projectId = getBigQueryProjectId()

  const {
    responsableNombreExpr,
    responsableNombreSelect,
    responsableEmailSelect,
    responsableNotionIdSelect
  } = buildResponsableSignals(columns)

  return runQuery<OperationalLoadRow>(
    `
      SELECT
        ${responsableNombreSelect}
        ${responsableEmailSelect}
        ${responsableNotionIdSelect}
        COUNT(*) AS total_assets,
        COUNTIF(t.estado NOT IN UNNEST(@inactiveStatuses)) AS active_assets,
        COUNTIF(t.estado IN UNNEST(@completedStatuses)) AS completed_assets,
        ROUND(AVG(CASE WHEN SAFE_CAST(t.rpa AS FLOAT64) > 0 THEN SAFE_CAST(t.rpa AS FLOAT64) END), 2) AS avg_rpa,
        COUNT(DISTINCT t.proyecto) AS project_count
      FROM \`${projectId}.notion_ops.tareas\` AS t
      WHERE t.proyecto IN UNNEST(@projectIds)
        AND ${responsableNombreExpr} IS NOT NULL
        AND TRIM(${responsableNombreExpr}) != ''
      GROUP BY responsable_nombre, responsable_email, responsable_notion_id
    `,
    {
      projectIds,
      inactiveStatuses,
      completedStatuses
    }
  )
}

const getProjectBreakdownRows = async (projectIds: string[], columns: Set<string>) => {
  if (projectIds.length === 0 || !hasOperationalColumns(columns)) {
    return [] as ProjectBreakdownRow[]
  }

  const projectId = getBigQueryProjectId()

  const {
    responsableNombreExpr,
    responsableNombreSelect,
    responsableEmailSelect,
    responsableNotionIdSelect
  } = buildResponsableSignals(columns)

  return runQuery<ProjectBreakdownRow>(
    `
      SELECT
        ${responsableNombreSelect}
        ${responsableEmailSelect}
        ${responsableNotionIdSelect}
        t.proyecto AS project_id,
        COALESCE(p.nombre_del_proyecto, t.proyecto) AS project_name,
        COUNT(*) AS asset_count,
        COUNTIF(t.estado NOT IN UNNEST(@inactiveStatuses)) AS active_count
      FROM \`${projectId}.notion_ops.tareas\` AS t
      LEFT JOIN \`${projectId}.notion_ops.proyectos\` AS p
        ON p.notion_page_id = t.proyecto
      WHERE t.proyecto IN UNNEST(@projectIds)
        AND ${responsableNombreExpr} IS NOT NULL
        AND TRIM(${responsableNombreExpr}) != ''
      GROUP BY responsable_nombre, responsable_email, responsable_notion_id, project_id, project_name
      ORDER BY responsable_nombre, active_count DESC, asset_count DESC
    `,
    {
      projectIds,
      inactiveStatuses
    }
  )
}

const buildCapacityMembers = (
  assignments: TeamAssignment[],
  loadRows: OperationalLoadRow[],
  projectBreakdownRows: ProjectBreakdownRow[]
) => {
  const lookup = buildLookup(assignments)
  const breakdownByMemberId = new Map<string, TeamCapacityMember['projectBreakdown']>()

  for (const row of projectBreakdownRows) {
    const assignment = matchAssignment(lookup, {
      responsableNombre: row.responsable_nombre,
      responsableEmail: row.responsable_email,
      responsableNotionId: row.responsable_notion_id
    })

    if (!assignment) {
      continue
    }

    const current = breakdownByMemberId.get(assignment.memberId) || []

    current.push({
      projectId: row.project_id,
      projectName: row.project_name || row.project_id || 'Proyecto',
      assetCount: toNumber(row.asset_count),
      activeCount: toNumber(row.active_count)
    })

    breakdownByMemberId.set(assignment.memberId, current)
  }

  return sortAssignments(
    assignments.map(assignment => {
      const loadRow =
        loadRows.find(row => {
          const matched = matchAssignment(lookup, {
            responsableNombre: row.responsable_nombre,
            responsableEmail: row.responsable_email,
            responsableNotionId: row.responsable_notion_id
          })

          return matched?.memberId === assignment.memberId
        }) || null

      const projectBreakdown = breakdownByMemberId.get(assignment.memberId) || []
      const activeAssets = toNumber(loadRow?.active_assets)
      const completedAssets = toNumber(loadRow?.completed_assets)

      const expectedMonthlyThroughput = getExpectedMonthlyThroughput({
        roleCategory: assignment.roleCategory,
        fteAllocation: assignment.fteAllocation
      })

      const utilizationPercent = getUtilizationPercent({
        activeAssets,
        expectedMonthlyThroughput
      })

      return {
        memberId: assignment.memberId,
        displayName: assignment.displayName,
        avatarUrl: assignment.avatarUrl,
        roleTitle: assignment.roleTitle,
        roleCategory: assignment.roleCategory,
        identityProviders: assignment.identityProviders,
        identityConfidence: assignment.identityConfidence,
        fteAllocation: assignment.fteAllocation,
        assignedHoursMonth: getAssignedHoursMonth(assignment.fteAllocation),
        expectedMonthlyThroughput,
        utilizationPercent,
        capacityHealth: getCapacityHealth(utilizationPercent),
        activeAssets,
        completedAssets,
        avgRpa: toNullableNumber(loadRow?.avg_rpa),
        projectCount: Math.max(projectBreakdown.length, toNumber(loadRow?.project_count)),
        projectBreakdown
      }
    })
  )
}

const getSummaryUtilizationPercent = (members: TeamCapacityMember[]) => {
  const activeAssets = members.reduce((sum, member) => sum + member.activeAssets, 0)
  const expectedMonthlyThroughput = members.reduce((sum, member) => sum + member.expectedMonthlyThroughput, 0)

  return getUtilizationPercent({
    activeAssets,
    expectedMonthlyThroughput
  })
}

const buildHealthBuckets = (members: TeamCapacityMember[]) =>
  members.reduce(
    (acc, member) => {
      if (member.capacityHealth === 'overloaded') {
        acc.overloadedMembers += 1
      } else if (member.capacityHealth === 'high') {
        acc.highLoadMembers += 1
      } else if (member.capacityHealth === 'balanced') {
        acc.balancedMembers += 1
      } else {
        acc.idleMembers += 1
      }

      return acc
    },
    {
      idleMembers: 0,
      balancedMembers: 0,
      highLoadMembers: 0,
      overloadedMembers: 0
    }
  )

const buildRoleBreakdown = (members: TeamCapacityMember[]) => {
  const byRole = new Map<TeamRoleCategory, TeamCapacityMember[]>()

  for (const member of members) {
    const current = byRole.get(member.roleCategory) || []

    current.push(member)
    byRole.set(member.roleCategory, current)
  }

  return Array.from(byRole.entries())
    .map(([roleCategory, roleMembers]) => {
      const totalFte = roundToTenths(roleMembers.reduce((sum, member) => sum + member.fteAllocation, 0))
      const assignedHoursMonth = roleMembers.reduce((sum, member) => sum + member.assignedHoursMonth, 0)
      const activeAssets = roleMembers.reduce((sum, member) => sum + member.activeAssets, 0)
      const expectedMonthlyThroughput = roleMembers.reduce((sum, member) => sum + member.expectedMonthlyThroughput, 0)

      return {
        roleCategory,
        memberCount: roleMembers.length,
        totalFte,
        assignedHoursMonth,
        activeAssets,
        utilizationPercent: getUtilizationPercent({
          activeAssets,
          expectedMonthlyThroughput
        })
      }
    })
    .sort((left, right) => left.memberCount - right.memberCount || left.roleCategory.localeCompare(right.roleCategory, 'es'))
}

const getProjectName = async (projectIdValue: string) => {
  const projectId = getBigQueryProjectId()

  const rows = await runQuery<{ project_name: string | null }>(
    `
      SELECT COALESCE(nombre_del_proyecto, notion_page_id) AS project_name
      FROM \`${projectId}.notion_ops.proyectos\`
      WHERE notion_page_id = @projectId
      LIMIT 1
    `,
    { projectId: projectIdValue }
  )

  return rows[0]?.project_name || null
}

const getProjectTeamRows = async (projectIdValue: string, columns: Set<string>) => {
  if (!hasOperationalColumns(columns)) {
    return [] as ProjectTeamRow[]
  }

  const projectId = getBigQueryProjectId()

  const {
    responsableNombreExpr,
    responsableNombreSelect,
    responsableEmailSelect,
    responsableNotionIdSelect
  } = buildResponsableSignals(columns)

  return runQuery<ProjectTeamRow>(
    `
      SELECT
        ${responsableNombreSelect}
        ${responsableEmailSelect}
        ${responsableNotionIdSelect}
        COUNT(*) AS total_assets,
        COUNTIF(t.estado NOT IN UNNEST(@inactiveStatuses)) AS active_assets,
        COUNTIF(t.estado IN UNNEST(@completedStatuses)) AS completed_assets,
        ROUND(AVG(CASE WHEN SAFE_CAST(t.rpa AS FLOAT64) > 0 THEN SAFE_CAST(t.rpa AS FLOAT64) END), 2) AS avg_rpa,
        COUNTIF(t.estado IN ('Listo para revisión', 'Listo para revision')) AS in_review,
        COUNTIF(t.estado = 'Cambios Solicitados') AS changes_requested
      FROM \`${projectId}.notion_ops.tareas\` AS t
      WHERE t.proyecto = @projectId
        AND ${responsableNombreExpr} IS NOT NULL
        AND TRIM(${responsableNombreExpr}) != ''
      GROUP BY responsable_nombre, responsable_email, responsable_notion_id
      ORDER BY active_assets DESC, total_assets DESC
    `,
    {
      projectId: projectIdValue,
      inactiveStatuses,
      completedStatuses
    }
  )
}

const enrichProjectMember = (
  row: ProjectTeamRow,
  lookup: Map<string, TeamAssignment>
): TeamByProjectMember => {
  const assignment = matchAssignment(lookup, {
    responsableNombre: row.responsable_nombre,
    responsableEmail: row.responsable_email,
    responsableNotionId: row.responsable_notion_id
  })

  return {
    memberId: assignment?.memberId || createSyntheticMemberId(row.responsable_nombre || '', row.responsable_email),
    displayName: assignment?.displayName || row.responsable_nombre || 'Efeonce Team',
    email: assignment?.email || row.responsable_email || null,
    avatarUrl: assignment?.avatarUrl || null,
    roleTitle: assignment?.roleTitle || 'Efeonce Team',
    roleCategory: assignment?.roleCategory || 'unknown',
    identityProviders: assignment?.identityProviders || [],
    identityConfidence: assignment?.identityConfidence || 'basic',
    totalAssets: toNumber(row.total_assets),
    activeAssets: toNumber(row.active_assets),
    completedAssets: toNumber(row.completed_assets),
    avgRpa: toNullableNumber(row.avg_rpa),
    inReview: toNumber(row.in_review),
    changesRequested: toNumber(row.changes_requested)
  }
}

const getSprintContext = async (sprintId: string, projectIds: string[]) => {
  const projectId = getBigQueryProjectId()

  const rows = await runQuery<SprintContextRow>(
    `
      WITH sprint_tasks AS (
        SELECT
          COUNT(*) AS total_tasks,
          COUNTIF(t.estado IN UNNEST(@completedStatuses)) AS completed_tasks
        FROM \`${projectId}.notion_ops.tareas\` AS t
        WHERE t.proyecto IN UNNEST(@projectIds)
          AND (
            @sprintId IN UNNEST(IFNULL(t.sprint_ids, ARRAY<STRING>[]))
            OR t.sprint = @sprintId
          )
      )
      SELECT
        s.notion_page_id,
        s.nombre_del_sprint AS sprint_name,
        s.estado_del_sprint AS sprint_status,
        s.fechas AS start_date,
        s.fechas_end AS end_date,
        COALESCE(st.total_tasks, 0) AS total_tasks,
        COALESCE(st.completed_tasks, 0) AS completed_tasks
      FROM \`${projectId}.notion_ops.sprints\` AS s
      CROSS JOIN sprint_tasks AS st
      WHERE s.notion_page_id = @sprintId
      LIMIT 1
    `,
    {
      sprintId,
      projectIds,
      completedStatuses
    }
  )

  return rows[0] || null
}

const getSprintTeamRows = async (sprintId: string, projectIds: string[], columns: Set<string>) => {
  if (projectIds.length === 0 || !hasOperationalColumns(columns)) {
    return [] as SprintTeamRow[]
  }

  const projectId = getBigQueryProjectId()

  const {
    responsableNombreExpr,
    responsableNombreSelect,
    responsableEmailSelect,
    responsableNotionIdSelect
  } = buildResponsableSignals(columns)

  return runQuery<SprintTeamRow>(
    `
      SELECT
        ${responsableNombreSelect}
        ${responsableEmailSelect}
        ${responsableNotionIdSelect}
        COUNT(*) AS total_in_sprint,
        COUNTIF(t.estado IN UNNEST(@completedStatuses)) AS completed,
        COUNTIF(t.estado NOT IN UNNEST(@inactiveStatuses)) AS pending,
        ROUND(AVG(CASE WHEN SAFE_CAST(t.rpa AS FLOAT64) > 0 THEN SAFE_CAST(t.rpa AS FLOAT64) END), 2) AS avg_rpa
      FROM \`${projectId}.notion_ops.tareas\` AS t
      WHERE t.proyecto IN UNNEST(@projectIds)
        AND (
          @sprintId IN UNNEST(IFNULL(t.sprint_ids, ARRAY<STRING>[]))
          OR t.sprint = @sprintId
        )
        AND ${responsableNombreExpr} IS NOT NULL
        AND TRIM(${responsableNombreExpr}) != ''
      GROUP BY responsable_nombre, responsable_email, responsable_notion_id
      ORDER BY completed DESC, total_in_sprint DESC
    `,
    {
      sprintId,
      projectIds,
      completedStatuses,
      inactiveStatuses
    }
  )
}

const enrichSprintMember = (row: SprintTeamRow, lookup: Map<string, TeamAssignment>): TeamBySprintMember => {
  const assignment = matchAssignment(lookup, {
    responsableNombre: row.responsable_nombre,
    responsableEmail: row.responsable_email,
    responsableNotionId: row.responsable_notion_id
  })

  return {
    memberId: assignment?.memberId || createSyntheticMemberId(row.responsable_nombre || '', row.responsable_email),
    displayName: assignment?.displayName || row.responsable_nombre || 'Efeonce Team',
    email: assignment?.email || row.responsable_email || null,
    avatarUrl: assignment?.avatarUrl || null,
    roleTitle: assignment?.roleTitle || 'Efeonce Team',
    roleCategory: assignment?.roleCategory || 'unknown',
    identityProviders: assignment?.identityProviders || [],
    identityConfidence: assignment?.identityConfidence || 'basic',
    totalInSprint: toNumber(row.total_in_sprint),
    completed: toNumber(row.completed),
    pending: toNumber(row.pending),
    avgRpa: toNullableNumber(row.avg_rpa)
  }
}

const getAssignmentsOrFallback = async (viewer: TeamQueryViewer): Promise<{ assignments: TeamAssignment[]; source: TeamDataSource }> => {
  try {
    const assignments = await enrichAssignmentsWithIdentity(toAssignments(await getAssignmentRows(viewer.clientId)))

    return {
      assignments,
      source: 'team_assignments'
    }
  } catch (error) {
    if (!isMissingBigQueryEntityError(error)) {
      throw error
    }

    const fallback = toLegacyMemberResponse(viewer)

    return {
      assignments: fallback.members.map(member => ({
        memberId: member.memberId,
        displayName: member.displayName,
        email: member.email,
        avatarUrl: member.avatarUrl,
        roleTitle: member.roleTitle,
        roleCategory: member.roleCategory,
        relevanceNote: member.relevanceNote,
        contactChannel: member.contactChannel,
        contactHandle: member.contactHandle,
        fteAllocation: member.fteAllocation,
        startDate: member.startDate,
        notionDisplayName: null,
        notionUserId: null,
        identityProfileId: null,
        emailAliases: [],
        azureOid: null,
        hubspotOwnerId: null,
        profile: member.profile,
        identityProviders: member.identityProviders,
        identityConfidence: member.identityConfidence,
        identityMatchSignals: []
      })),
      source: 'legacy_override'
    }
  }
}

export const getTeamMembers = async (viewer: TeamQueryViewer): Promise<TeamMembersPayload> => {
  try {
    const rows = await getAssignmentRows(viewer.clientId)
    const assignments = await enrichAssignmentsWithIdentity(toAssignments(rows))

    return {
      members: assignments.map(assignment => ({
        memberId: assignment.memberId,
        displayName: assignment.displayName,
        email: assignment.email,
        avatarUrl: assignment.avatarUrl,
        roleTitle: assignment.roleTitle,
        roleCategory: assignment.roleCategory,
        relevanceNote: assignment.relevanceNote,
        contactChannel: assignment.contactChannel,
        contactHandle: assignment.contactHandle,
        fteAllocation: assignment.fteAllocation,
        startDate: assignment.startDate,
        profile: assignment.profile,
        identityProviders: assignment.identityProviders,
        identityConfidence: assignment.identityConfidence
      })),
      footer: {
        serviceLines: viewer.businessLines,
        modality: viewer.serviceModules.length > 0 ? 'On-Going' : null,
        totalFte: roundToTenths(assignments.reduce((sum, assignment) => sum + assignment.fteAllocation, 0))
      },
      source: 'team_assignments'
    }
  } catch (error) {
    if (!isMissingBigQueryEntityError(error)) {
      throw error
    }

    return toLegacyMemberResponse(viewer)
  }
}

export const getTeamCapacity = async (viewer: TeamQueryViewer): Promise<TeamCapacityPayload> => {
  const { assignments, source } = await getAssignmentsOrFallback(viewer)

  if (assignments.length === 0 && source === 'legacy_override') {
    return toCapacityFallback(viewer)
  }

  const operationalColumns = await getOperationalColumns()
  const loadRows = await getOperationalLoadRows(viewer.projectIds, operationalColumns)
  const projectBreakdownRows = await getProjectBreakdownRows(viewer.projectIds, operationalColumns)
  const members = buildCapacityMembers(assignments, loadRows, projectBreakdownRows)
  const totalFte = roundToTenths(members.reduce((sum, member) => sum + member.fteAllocation, 0))
  const totalHoursMonth = Math.round(totalFte * 160)
  const utilizationPercent = getSummaryUtilizationPercent(members)
  const activeAssets = members.reduce((sum, member) => sum + member.activeAssets, 0)
  const completedAssets = members.reduce((sum, member) => sum + member.completedAssets, 0)
  const expectedMonthlyThroughput = roundToTenths(members.reduce((sum, member) => sum + member.expectedMonthlyThroughput, 0))
  const healthBuckets = buildHealthBuckets(members)

  return {
    summary: {
      totalFte,
      totalHoursMonth,
      assignedHoursMonth: totalHoursMonth,
      utilizedHoursMonth: Math.round((totalHoursMonth * utilizationPercent) / 100),
      utilizationPercent,
      memberCount: members.length,
      activeAssets,
      completedAssets,
      expectedMonthlyThroughput,
      healthBuckets
    },
    members,
    roleBreakdown: buildRoleBreakdown(members),
    period: periodFormatter.format(new Date()),
    source,
    hasOperationalMetrics: hasOperationalColumns(operationalColumns)
  }
}

export const getTeamByProject = async (
  viewer: TeamQueryViewer,
  projectIdValue: string
): Promise<TeamByProjectPayload> => {
  const { assignments } = await getAssignmentsOrFallback(viewer)
  const lookup = buildLookup(assignments)
  const operationalColumns = await getOperationalColumns()

  if (!hasOperationalColumns(operationalColumns)) {
    return {
      projectId: projectIdValue,
      projectName: await getProjectName(projectIdValue),
      memberCount: 0,
      members: [],
      hasOperationalMetrics: false
    }
  }

  const [projectName, rows] = await Promise.all([getProjectName(projectIdValue), getProjectTeamRows(projectIdValue, operationalColumns)])
  const members = rows.map(row => enrichProjectMember(row, lookup))

  return {
    projectId: projectIdValue,
    projectName,
    memberCount: members.length,
    members,
    hasOperationalMetrics: true
  }
}

export const getTeamBySprint = async (
  viewer: TeamQueryViewer,
  sprintId: string
): Promise<TeamBySprintPayload> => {
  const { assignments } = await getAssignmentsOrFallback(viewer)
  const lookup = buildLookup(assignments)
  const operationalColumns = await getOperationalColumns()
  const sprintContext = await getSprintContext(sprintId, viewer.projectIds)

  if (!hasOperationalColumns(operationalColumns)) {
    return {
      sprintId,
      sprintName: sprintContext?.sprint_name || null,
      sprintStatus: sprintContext?.sprint_status || null,
      startDate: toDateString(sprintContext?.start_date || null),
      endDate: toDateString(sprintContext?.end_date || null),
      totalTasks: toNumber(sprintContext?.total_tasks),
      completedTasks: toNumber(sprintContext?.completed_tasks),
      memberCount: 0,
      members: [],
      hasOperationalMetrics: false
    }
  }

  const rows = await getSprintTeamRows(sprintId, viewer.projectIds, operationalColumns)
  const members = rows.map(row => enrichSprintMember(row, lookup))

  return {
    sprintId,
    sprintName: sprintContext?.sprint_name || null,
    sprintStatus: sprintContext?.sprint_status || null,
    startDate: toDateString(sprintContext?.start_date || null),
    endDate: toDateString(sprintContext?.end_date || null),
    totalTasks: toNumber(sprintContext?.total_tasks),
    completedTasks: toNumber(sprintContext?.completed_tasks),
    memberCount: members.length,
    members,
    hasOperationalMetrics: true
  }
}
