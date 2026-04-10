import 'server-only'

import type { PeopleListPayload, PersonListItem } from '@/types/people'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { readMemberCapacityEconomicsBatch } from '@/lib/member-capacity-economics/store'
import { PeopleValidationError, getPeopleTableColumns, pickMemberEmails, roundToTenths, runPeopleQuery, toNumber, toStringArray } from '@/lib/people/shared'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'

type PeopleListRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  email_aliases: string[] | null
  role_title: string | null
  role_category: string | null
  avatar_url: string | null
  location_country: string | null
  active: boolean | null
  pay_regime: string | null
}

const normalizePersonListItem = (row: PeopleListRow): PersonListItem => {
  const emailAliases = toStringArray(row.email_aliases)

  const { publicEmail, internalEmail } = pickMemberEmails({
    email: row.email,
    emailAliases
  })

  return {
    memberId: String(row.member_id || ''),
    displayName: String(row.display_name || 'Sin nombre'),
    publicEmail,
    internalEmail,
    roleTitle: String(row.role_title || 'Efeonce Team'),
    roleCategory: String(row.role_category || 'unknown'),
    avatarUrl: row.avatar_url || resolveAvatarPath({ name: row.display_name, email: publicEmail }),
    locationCountry: row.location_country || null,
    active: Boolean(row.active),
    totalAssignments: 0,
    contractedFte: 1,
    assignedFte: 0,
    totalFte: 0,
    payRegime: row.pay_regime === 'international' ? 'international' : row.pay_regime === 'chile' ? 'chile' : null
  }
}

/**
 * Enrich list items with canonical capacity data from member_capacity_economics snapshot.
 * This is the single source of truth for FTE, assignments and capacity per the
 * GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1 consumer rules.
 */
const enrichFromCapacitySnapshot = async (items: PersonListItem[]): Promise<void> => {
  if (items.length === 0) return

  const now = new Date()
  const memberIds = items.map(item => item.memberId).filter(Boolean)

  let snapshots: Map<string, { contractedFte: number; assignedHours: number; assignmentCount: number }>

  try {
    snapshots = await readMemberCapacityEconomicsBatch({
      memberIds,
      year: now.getFullYear(),
      month: now.getMonth() + 1
    })
  } catch (error) {
    if (!shouldIgnoreCapacitySnapshotError(error)) {
      throw error
    }

    console.warn(
      '[people/list] Capacity snapshot enrichment unavailable, serving roster without economics overlay:',
      error instanceof Error ? error.message : error
    )

    return
  }

  for (const item of items) {
    const snapshot = snapshots.get(item.memberId)

    if (snapshot) {
      item.contractedFte = roundToTenths(snapshot.contractedFte)
      item.assignedFte = roundToTenths(snapshot.assignedHours / 160)
      item.totalFte = item.assignedFte
      item.totalAssignments = snapshot.assignmentCount
    }
  }
}

const shouldIgnoreCapacitySnapshotError = (error: unknown) => {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  return (
    msg.includes('permission denied') ||
    msg.includes('not authorized') ||
    (msg.includes('schema') && msg.includes('greenhouse_serving')) ||
    msg.includes('member_capacity_economics')
  )
}

const buildRoleCategoryFilters = (items: PersonListItem[]) =>
  Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      acc[item.roleCategory] = (acc[item.roleCategory] || 0) + 1

      return acc
    }, {})
  )
    .map(([roleCategory, count]) => ({
      roleCategory: roleCategory as PersonListItem['roleCategory'],
      count
    }))
    .sort((left, right) => right.count - left.count || left.roleCategory.localeCompare(right.roleCategory, 'es'))

const buildCountryFilters = (items: PersonListItem[]) =>
  Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      const key = item.locationCountry || 'unknown'

      acc[key] = (acc[key] || 0) + 1

      return acc
    }, {})
  )
    .map(([countryCode, count]) => ({
      countryCode,
      count
    }))
    .sort((left, right) => right.count - left.count || left.countryCode.localeCompare(right.countryCode, 'es'))

const buildPayRegimeFilters = (items: PersonListItem[]) =>
  (['chile', 'international', 'unknown'] as const).map(payRegime => ({
    payRegime,
    count: items.filter(item => (item.payRegime || 'unknown') === payRegime).length
  }))

const buildPayload = async (
  items: PersonListItem[],
  getCoveredClients: () => Promise<number>
): Promise<PeopleListPayload> => {
  await enrichFromCapacitySnapshot(items)

  return {
    items,
    summary: {
      activeMembers: items.filter(item => item.active).length,
      totalFte: roundToTenths(items.reduce((sum, item) => sum + item.contractedFte, 0)),
      coveredClients: await getCoveredClients(),
      chileCount: items.filter(item => item.payRegime === 'chile').length,
      internationalCount: items.filter(item => item.payRegime === 'international').length
    },
    filters: {
      roleCategories: buildRoleCategoryFilters(items),
      countries: buildCountryFilters(items),
      payRegimes: buildPayRegimeFilters(items)
    }
  }
}

// ---------------------------------------------------------------------------
// Postgres-first path — roster + pay_regime only; capacity from snapshot
// ---------------------------------------------------------------------------

const getPeopleListFromPostgres = async (
  organizationId?: string | null,
  memberIds?: string[]
): Promise<PeopleListPayload> => {
  const organizationFilterJoin = organizationId
    ? `
    JOIN greenhouse_core.person_memberships pm
      ON pm.profile_id = m.identity_profile_id
     AND pm.active = TRUE
     AND pm.organization_id = $1
     AND pm.membership_type = 'team_member'`
    : ''

  const values: unknown[] = []

  if (organizationId) {
    values.push(organizationId)
  }

  const memberFilterClause = memberIds && memberIds.length > 0
    ? `WHERE m.member_id = ANY($${values.length + 1}::text[])`
    : ''

  if (memberIds && memberIds.length > 0) {
    values.push(memberIds)
  }

  const rows = await runGreenhousePostgresQuery<PeopleListRow>(`
    WITH current_comp AS (
      SELECT DISTINCT ON (member_id)
        member_id,
        pay_regime
      FROM greenhouse_payroll.compensation_versions
      WHERE is_current = TRUE
      ORDER BY member_id
    )
    SELECT
      m.member_id,
      m.display_name,
      m.primary_email AS email,
      COALESCE(m.email_aliases, ARRAY[]::text[]) AS email_aliases,
      m.role_title,
      m.role_category,
      m.avatar_url,
      m.location_country,
      m.active,
      c.pay_regime
    FROM greenhouse_core.members m
    LEFT JOIN current_comp c ON c.member_id = m.member_id
    ${organizationFilterJoin}
    ${memberFilterClause}
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
  `, values)

  const items = rows.map(normalizePersonListItem)

  return buildPayload(items, () => getCoveredClientsCountFromPostgres(organizationId, memberIds))
}

const getCoveredClientsCountFromPostgres = async (
  organizationId?: string | null,
  memberIds?: string[]
) => {
  const values: unknown[] = []
  const filters = ['a.active = TRUE', '(a.end_date IS NULL OR a.end_date >= CURRENT_DATE)']

  if (organizationId) {
    values.push(organizationId)
  }

  if (memberIds && memberIds.length > 0) {
    values.push(memberIds)
    filters.push(`a.member_id = ANY($${values.length}::text[])`)
  }

  const [row] = await runGreenhousePostgresQuery<{ covered_clients: string | number | null }>(`
    SELECT COUNT(DISTINCT a.client_id) AS covered_clients
    FROM greenhouse_core.client_team_assignments a
    ${organizationId
      ? `JOIN greenhouse_core.spaces s
          ON s.client_id = a.client_id
         AND s.active = TRUE
         AND s.organization_id = $1`
      : ''}
    WHERE ${filters.join(' AND ')}
  `, values)

  return toNumber(row?.covered_clients)
}

// ---------------------------------------------------------------------------
// BigQuery fallback path — roster + pay_regime only; capacity from snapshot
// ---------------------------------------------------------------------------

const getPeopleListFromBigQuery = async (memberIds?: string[]): Promise<PeopleListPayload> => {
  const projectId = getBigQueryProjectId()
  const memberColumns = await getPeopleTableColumns('greenhouse', 'team_members')
  const compensationColumns = await getPeopleTableColumns('greenhouse', 'compensation_versions')

  const emailAliasesSelect = memberColumns.has('email_aliases')
    ? 'COALESCE(tm.email_aliases, ARRAY<STRING>[]) AS email_aliases,'
    : 'ARRAY<STRING>[] AS email_aliases,'

  const locationCountrySelect = memberColumns.has('location_country')
    ? 'tm.location_country,'
    : 'CAST(NULL AS STRING) AS location_country,'

  const currentCompensationCte =
    compensationColumns.size > 0
      ? `
      current_compensation AS (
        SELECT
          member_id,
          ANY_VALUE(pay_regime) AS pay_regime
        FROM \`${projectId}.greenhouse.compensation_versions\`
        WHERE is_current = TRUE
        GROUP BY member_id
      )`
      : `
      current_compensation AS (
        SELECT
          CAST(NULL AS STRING) AS member_id,
          CAST(NULL AS STRING) AS pay_regime
        WHERE FALSE
      )`

  const memberFilterClause = memberIds && memberIds.length > 0
    ? 'WHERE tm.member_id IN UNNEST(@memberIds)'
    : ''

  const rows = await runPeopleQuery<PeopleListRow>(
    `
      WITH ${currentCompensationCte}
      SELECT
        tm.member_id,
        tm.display_name,
        tm.email,
        ${emailAliasesSelect}
        tm.role_title,
        tm.role_category,
        tm.avatar_url,
        ${locationCountrySelect}
        tm.active,
        c.pay_regime
      FROM \`${projectId}.greenhouse.team_members\` AS tm
      LEFT JOIN current_compensation AS c
        ON c.member_id = tm.member_id
      ${memberFilterClause}
      ORDER BY
        CASE tm.role_category
          WHEN 'account' THEN 1
          WHEN 'operations' THEN 2
          WHEN 'strategy' THEN 3
          WHEN 'design' THEN 4
          WHEN 'development' THEN 5
          WHEN 'media' THEN 6
          ELSE 7
        END,
        tm.display_name
    `,
    memberIds && memberIds.length > 0 ? { memberIds } : {}
  )

  const items = rows.map(normalizePersonListItem)

  return buildPayload(items, () => getCoveredClientsCountFromBigQuery(projectId, memberIds))
}

const getCoveredClientsCountFromBigQuery = async (projectId: string, memberIds?: string[]) => {
  const memberFilterClause = memberIds && memberIds.length > 0
    ? 'AND member_id IN UNNEST(@memberIds)'
    : ''

  const [row] = await runPeopleQuery<{ covered_clients: number | string | null }>(
    `
      SELECT COUNT(DISTINCT client_id) AS covered_clients
      FROM \`${projectId}.greenhouse.client_team_assignments\`
      WHERE active = TRUE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE())
        ${memberFilterClause}
    `,
    memberIds && memberIds.length > 0 ? { memberIds } : {}
  )

  return toNumber(row?.covered_clients)
}

// ---------------------------------------------------------------------------
// Public API — Postgres-first with BigQuery fallback
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

export const getPeopleList = async (
  options: { organizationId?: string | null; memberIds?: string[] } = {}
): Promise<PeopleListPayload> => {
  const organizationId = options.organizationId?.trim() || null
  const memberIds = options.memberIds?.filter(Boolean) ?? []

  if (isGreenhousePostgresConfigured()) {
    try {
      return await getPeopleListFromPostgres(organizationId, memberIds)
    } catch (error) {
      if (!shouldFallbackToLegacy(error)) throw error
      console.warn('[people/list] Postgres failed, falling back to BigQuery:', error instanceof Error ? error.message : error)
    }
  }

  if (organizationId) {
    throw new PeopleValidationError('Organization-scoped people list requires PostgreSQL runtime.', 503)
  }

  return getPeopleListFromBigQuery(memberIds)
}
