import 'server-only'

import type { CompensationVersion } from '@/types/payroll'
import type { PersonAccess, PersonDetail, PersonDetailAssignment, PersonDetailMember, PersonIntegrations } from '@/types/people'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { getMemberPayrollHistory } from '@/lib/payroll/get-payroll-entries'
import { getPersonOperationalMetrics } from '@/lib/people/get-person-operational-metrics'
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
import type { TeamIdentityProvider } from '@/types/team'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'

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
}

type IdentitySourceRow = {
  source_object_id: string | null
  source_user_id: string | null
  source_email: string | null
  source_display_name: string | null
  source_system: string | null
}

const projectId = getBigQueryProjectId()

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
    active: Boolean(row.active)
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
    totalFte,
    totalHoursMonth
  }
}

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
      memberId: String(row.member_id || ''),
      displayName: String(row.display_name || 'Sin nombre'),
      publicEmail,
      internalEmail,
      avatarUrl: row.avatar_url || resolveAvatarPath({ name: row.display_name, email: publicEmail }),
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

const getMemberById = async (memberId: string) => {
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

const getAssignmentsByMember = async (memberId: string) =>
  runPeopleQuery<AssignmentRow>(
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

const getIdentityProvidersByProfile = async (identityProfileId: string | null) => {
  if (!identityProfileId) {
    return [] as IdentitySourceRow[]
  }

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

export const getPersonDetail = async ({
  memberId,
  access
}: {
  memberId: string
  access: PersonAccess
}): Promise<PersonDetail> => {
  const memberRow = await getMemberById(memberId)

  if (!memberRow) {
    throw new PeopleValidationError('Person not found.', 404, { memberId })
  }

  const { member, emailAliases } = buildPersonMember(memberRow)
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

  tasks.push(
    getAssignmentsByMember(memberId).then(rows => {
      detail.summary = buildAssignmentsSummary(rows)

      if (access.canViewAssignments) {
        detail.assignments = normalizeAssignments(rows)
      }
    })
  )

  if (access.canViewActivity) {
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
        detail.operationalMetrics = metrics
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
      })
    )
  }

  await Promise.all(tasks)

  return detail
}
