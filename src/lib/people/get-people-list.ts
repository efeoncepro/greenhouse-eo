import 'server-only'

import type { PeopleListPayload, PersonListItem } from '@/types/people'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getPeopleTableColumns, pickMemberEmails, roundToTenths, runPeopleQuery, toNumber, toStringArray } from '@/lib/people/shared'
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
  total_assignments: number | string | null
  total_fte: number | string | null
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
    totalAssignments: toNumber(row.total_assignments),
    totalFte: roundToTenths(toNumber(row.total_fte)),
    payRegime: row.pay_regime === 'international' ? 'international' : row.pay_regime === 'chile' ? 'chile' : null
  }
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
): Promise<PeopleListPayload> => ({
  items,
  summary: {
    activeMembers: items.filter(item => item.active).length,
    totalFte: roundToTenths(items.reduce((sum, item) => sum + item.totalFte, 0)),
    coveredClients: await getCoveredClients(),
    chileCount: items.filter(item => item.payRegime === 'chile').length,
    internationalCount: items.filter(item => item.payRegime === 'international').length
  },
  filters: {
    roleCategories: buildRoleCategoryFilters(items),
    countries: buildCountryFilters(items),
    payRegimes: buildPayRegimeFilters(items)
  }
})

// ---------------------------------------------------------------------------
// Postgres-first path
// ---------------------------------------------------------------------------

const getPeopleListFromPostgres = async (): Promise<PeopleListPayload> => {
  const rows = await runGreenhousePostgresQuery<PeopleListRow>(`
    WITH assignment_agg AS (
      SELECT
        member_id,
        COUNT(*) FILTER (WHERE active AND (end_date IS NULL OR end_date >= CURRENT_DATE)) AS total_assignments,
        ROUND(SUM(
          CASE
            WHEN active AND (end_date IS NULL OR end_date >= CURRENT_DATE) THEN COALESCE(fte_allocation, 0)
            ELSE 0
          END
        )::numeric, 2) AS total_fte
      FROM greenhouse_core.client_team_assignments
      GROUP BY member_id
    ),
    current_comp AS (
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
      COALESCE(a.total_assignments, 0) AS total_assignments,
      COALESCE(a.total_fte, 0) AS total_fte,
      c.pay_regime
    FROM greenhouse_core.members m
    LEFT JOIN assignment_agg a ON a.member_id = m.member_id
    LEFT JOIN current_comp c ON c.member_id = m.member_id
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
  `)

  const items = rows.map(normalizePersonListItem)

  return buildPayload(items, getCoveredClientsCountFromPostgres)
}

const getCoveredClientsCountFromPostgres = async () => {
  const [row] = await runGreenhousePostgresQuery<{ covered_clients: string | number | null }>(`
    SELECT COUNT(DISTINCT client_id) AS covered_clients
    FROM greenhouse_core.client_team_assignments
    WHERE active = TRUE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  `)

  return toNumber(row?.covered_clients)
}

// ---------------------------------------------------------------------------
// BigQuery fallback path
// ---------------------------------------------------------------------------

const getPeopleListFromBigQuery = async (): Promise<PeopleListPayload> => {
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

  const rows = await runPeopleQuery<PeopleListRow>(
    `
      WITH assignment_agg AS (
        SELECT
          member_id,
          COUNTIF(active = TRUE AND (end_date IS NULL OR end_date >= CURRENT_DATE())) AS total_assignments,
          ROUND(SUM(
            CASE
              WHEN active = TRUE AND (end_date IS NULL OR end_date >= CURRENT_DATE()) THEN COALESCE(fte_allocation, 0)
              ELSE 0
            END
          ), 2) AS total_fte
        FROM \`${projectId}.greenhouse.client_team_assignments\`
        GROUP BY member_id
      ),
      ${currentCompensationCte}
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
        COALESCE(a.total_assignments, 0) AS total_assignments,
        COALESCE(a.total_fte, 0) AS total_fte,
        c.pay_regime
      FROM \`${projectId}.greenhouse.team_members\` AS tm
      LEFT JOIN assignment_agg AS a
        ON a.member_id = tm.member_id
      LEFT JOIN current_compensation AS c
        ON c.member_id = tm.member_id
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
    `
  )

  const items = rows.map(normalizePersonListItem)

  return buildPayload(items, () => getCoveredClientsCountFromBigQuery(projectId))
}

const getCoveredClientsCountFromBigQuery = async (projectId: string) => {
  const [row] = await runPeopleQuery<{ covered_clients: number | string | null }>(
    `
      SELECT COUNT(DISTINCT client_id) AS covered_clients
      FROM \`${projectId}.greenhouse.client_team_assignments\`
      WHERE active = TRUE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE())
    `
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

export const getPeopleList = async (): Promise<PeopleListPayload> => {
  if (isGreenhousePostgresConfigured()) {
    try {
      return await getPeopleListFromPostgres()
    } catch (error) {
      if (!shouldFallbackToLegacy(error)) throw error
      console.warn('[people/list] Postgres failed, falling back to BigQuery:', error instanceof Error ? error.message : error)
    }
  }

  return getPeopleListFromBigQuery()
}
