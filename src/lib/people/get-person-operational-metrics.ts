import 'server-only'

import type { PersonOperationalMetrics } from '@/types/people'

import { getBigQueryProjectId } from '@/lib/bigquery'
import {
  getPeopleTableColumns,
  normalizeMatchValue,
  runPeopleQuery,
  toNullableNumber,
  toNumber
} from '@/lib/people/shared'

type PersonOperationalInput = {
  displayName: string
  notionUserId: string | null
  publicEmail: string
  internalEmail: string | null
  emailAliases: string[]
  identityMatchSignals: string[]
  notionUserCandidates: string[]
}

type MetricsRow = {
  rpa_avg_30d: number | string | null
  tasks_completed_30d: number | string | null
  tasks_active_now: number | string | null
}

type OtdRow = {
  otd_percent_30d: number | string | null
}

type BreakdownRow = {
  project_id: string | null
  project_name: string | null
  asset_count: number | string | null
}

const completedStatuses = ['Listo', 'Done', 'Finalizado', 'Completado']
const inactiveStatuses = [...completedStatuses, 'Cancelado', 'Cancelada', 'Cancelled', 'Canceled']
const getProjectId = () => getBigQueryProjectId()

const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``
const pickFirstExistingColumn = (columns: Set<string>, candidates: string[]) => candidates.find(column => columns.has(column)) || null

const buildMatchClause = ({
  notionUserCandidates,
  signals,
  responsableNameExpr,
  allowNotionId
}: {
  notionUserCandidates: string[]
  signals: string[]
  responsableNameExpr: string
  allowNotionId: boolean
}) => {
  const clauses: string[] = []
  const params: Record<string, unknown> = {}

  if (allowNotionId && notionUserCandidates.length > 0) {
    clauses.push('t.responsables_ids[SAFE_OFFSET(0)] IN UNNEST(@notionUserCandidates)')
    params.notionUserCandidates = notionUserCandidates
  }

  if (signals.length > 0) {
    clauses.push(`LOWER(TRIM(${responsableNameExpr})) IN UNNEST(@matchSignals)`)
    params.matchSignals = signals
  }

  return {
    clause: clauses.length > 0 ? `(${clauses.join(' OR ')})` : 'FALSE',
    params
  }
}

export const getPersonOperationalMetrics = async ({
  displayName,
  notionUserId,
  publicEmail,
  internalEmail,
  emailAliases,
  identityMatchSignals,
  notionUserCandidates
}: PersonOperationalInput): Promise<PersonOperationalMetrics | null> => {
  const projectId = getProjectId()
  const columns = await getPeopleTableColumns('notion_ops', 'tareas')
  const statusColumn = pickFirstExistingColumn(columns, ['estado', 'status'])
  const rpaColumn = pickFirstExistingColumn(columns, ['rpa', 'frame_versions', 'client_change_round'])
  const actualDateColumn = pickFirstExistingColumn(columns, ['fecha_de_completado', 'fecha_entrega', 'completed_at', 'done_at'])
  const deadlineColumn = pickFirstExistingColumn(columns, ['fecha_límite', 'deadline', 'due_date', 'fecha_limite'])
  const timeFilterColumn = pickFirstExistingColumn(columns, ['last_edited_time', 'updated_at', 'created_time'])

  const responsableNameExpr = columns.has('responsables_names')
    ? columns.has('responsable_texto')
      ? 'COALESCE(t.responsables_names[SAFE_OFFSET(0)], t.responsable_texto)'
      : 't.responsables_names[SAFE_OFFSET(0)]'
    : columns.has('responsable_texto')
      ? 't.responsable_texto'
      : null

  if (!statusColumn || !rpaColumn || !timeFilterColumn || !responsableNameExpr) {
    return null
  }

  const signals = Array.from(
    new Set(
      [displayName, publicEmail, internalEmail, ...emailAliases, ...identityMatchSignals]
        .map(value => normalizeMatchValue(value))
        .filter(Boolean)
    )
  )

  const normalizedNotionUserCandidates = Array.from(
    new Set(
      [notionUserId, ...notionUserCandidates]
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )
  )

  const { clause: matchClause, params: matchParams } = buildMatchClause({
    notionUserCandidates: normalizedNotionUserCandidates,
    signals,
    responsableNameExpr,
    allowNotionId: columns.has('responsables_ids')
  })

  const [metricsRow] = await runPeopleQuery<MetricsRow>(
    `
      SELECT
        ROUND(AVG(CASE
          WHEN t.${quoteIdentifier(statusColumn)} IN UNNEST(@completedStatuses)
            AND t.${quoteIdentifier(timeFilterColumn)} >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
            AND SAFE_CAST(t.${quoteIdentifier(rpaColumn)} AS FLOAT64) > 0
          THEN SAFE_CAST(t.${quoteIdentifier(rpaColumn)} AS FLOAT64)
        END), 2) AS rpa_avg_30d,
        COUNTIF(
          t.${quoteIdentifier(statusColumn)} IN UNNEST(@completedStatuses)
          AND t.${quoteIdentifier(timeFilterColumn)} >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
        ) AS tasks_completed_30d,
        COUNTIF(t.${quoteIdentifier(statusColumn)} NOT IN UNNEST(@inactiveStatuses)) AS tasks_active_now
      FROM \`${projectId}.notion_ops.tareas\` AS t
      WHERE ${matchClause}
    `,
    {
      ...matchParams,
      completedStatuses,
      inactiveStatuses
    }
  )

  if (!metricsRow) {
    return null
  }

  let otdPercent30d: number | null = null

  if (actualDateColumn && deadlineColumn) {
    const [otdRow] = await runPeopleQuery<OtdRow>(
      `
        SELECT
          ROUND(
            SAFE_MULTIPLY(
              100,
              SAFE_DIVIDE(
                COUNTIF(
                  t.${quoteIdentifier(statusColumn)} IN UNNEST(@completedStatuses)
                  AND t.${quoteIdentifier(timeFilterColumn)} >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
                  AND SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(actualDateColumn)} AS STRING), 1, 10) AS DATE) IS NOT NULL
                  AND SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(deadlineColumn)} AS STRING), 1, 10) AS DATE) IS NOT NULL
                  AND SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(actualDateColumn)} AS STRING), 1, 10) AS DATE)
                    <= SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(deadlineColumn)} AS STRING), 1, 10) AS DATE)
                ),
                COUNTIF(
                  t.${quoteIdentifier(statusColumn)} IN UNNEST(@completedStatuses)
                  AND t.${quoteIdentifier(timeFilterColumn)} >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
                  AND SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(actualDateColumn)} AS STRING), 1, 10) AS DATE) IS NOT NULL
                  AND SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(deadlineColumn)} AS STRING), 1, 10) AS DATE) IS NOT NULL
                )
              )
            ),
            2
          ) AS otd_percent_30d
        FROM \`${projectId}.notion_ops.tareas\` AS t
        WHERE ${matchClause}
      `,
      {
        ...matchParams,
        completedStatuses
      }
    )

    otdPercent30d = toNullableNumber(otdRow?.otd_percent_30d)
  }

  const breakdownRows = await runPeopleQuery<BreakdownRow>(
    `
      SELECT
        t.proyecto AS project_id,
        COALESCE(p.nombre_del_proyecto, t.proyecto) AS project_name,
        COUNT(*) AS asset_count
      FROM \`${projectId}.notion_ops.tareas\` AS t
      LEFT JOIN \`${projectId}.notion_ops.proyectos\` AS p
        ON p.notion_page_id = t.proyecto
      WHERE ${matchClause}
        AND t.${quoteIdentifier(timeFilterColumn)} >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      GROUP BY project_id, project_name
      ORDER BY asset_count DESC, project_name
      LIMIT 10
    `,
    matchParams
  )

  return {
    rpaAvg30d: toNullableNumber(metricsRow.rpa_avg_30d),
    otdPercent30d,
    tasksCompleted30d: toNumber(metricsRow.tasks_completed_30d),
    tasksActiveNow: toNumber(metricsRow.tasks_active_now),
    projectBreakdown: breakdownRows.map(row => ({
      projectId: row.project_id || null,
      projectName: row.project_name || row.project_id || 'Proyecto',
      assetCount: toNumber(row.asset_count)
    }))
  }
}
