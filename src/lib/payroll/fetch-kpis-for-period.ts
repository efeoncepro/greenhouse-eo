import 'server-only'

import type { PayrollKpiDiagnostics, PayrollKpiSnapshot } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { getTableColumns, payrollCompletedStatuses, runPayrollQuery, toNullableNumber, toNumber } from '@/lib/payroll/shared'

type PayrollKpiRow = {
  notion_user_id: string | null
  avg_rpa: number | string | null
  tasks_completed: number | string | null
}

type PayrollOtdRow = {
  notion_user_id: string | null
  otd_percent: number | string | null
}

type FetchKpisInput = {
  periodStart: string
  periodEndExclusive: string
}

const getProjectId = () => getBigQueryProjectId()

const pickFirstExistingColumn = (columns: Set<string>, candidates: string[]) => candidates.find(column => columns.has(column)) || null
const quoteIdentifier = (identifier: string) => `\`${identifier.replace(/`/g, '``')}\``

export const fetchKpisForPeriod = async ({
  periodStart,
  periodEndExclusive
}: FetchKpisInput): Promise<{
  snapshots: Map<string, PayrollKpiSnapshot>
  diagnostics: PayrollKpiDiagnostics
}> => {
  const projectId = getProjectId()
  const columns = await getTableColumns('notion_ops', 'tareas')
  const timeFilterColumn = pickFirstExistingColumn(columns, ['last_edited_time', 'updated_at', 'created_time'])
  const statusColumn = pickFirstExistingColumn(columns, ['estado', 'status'])
  const identityColumn = columns.has('responsables_ids') ? 'responsables_ids' : null
  const rpaColumn = pickFirstExistingColumn(columns, ['rpa', 'frame_versions', 'client_change_round'])
  const actualDateColumn = pickFirstExistingColumn(columns, ['fecha_de_completado', 'fecha_entrega', 'completed_at', 'done_at'])
  const deadlineColumn = pickFirstExistingColumn(columns, ['fecha_límite', 'deadline', 'due_date', 'fecha_limite'])

  const diagnostics: PayrollKpiDiagnostics = {
    canMatchByNotionUserId: Boolean(identityColumn && timeFilterColumn && statusColumn),
    otdAutoAvailable: Boolean(identityColumn && timeFilterColumn && statusColumn && actualDateColumn && deadlineColumn),
    identityColumn,
    actualDateColumn,
    deadlineColumn,
    timeFilterColumn
  }

  if (!identityColumn || !timeFilterColumn || !statusColumn || !rpaColumn) {
    return {
      snapshots: new Map<string, PayrollKpiSnapshot>(),
      diagnostics
    }
  }

  const kpiRows = await runPayrollQuery<PayrollKpiRow>(
    `
      SELECT
        t.responsables_ids[SAFE_OFFSET(0)] AS notion_user_id,
        ROUND(AVG(CASE
          WHEN SAFE_CAST(t.${quoteIdentifier(rpaColumn)} AS FLOAT64) > 0 THEN SAFE_CAST(t.${quoteIdentifier(rpaColumn)} AS FLOAT64)
        END), 2) AS avg_rpa,
        COUNT(*) AS tasks_completed
      FROM \`${projectId}.notion_ops.tareas\` AS t
      WHERE t.${quoteIdentifier(statusColumn)} IN UNNEST(@completedStatuses)
        AND t.${quoteIdentifier(timeFilterColumn)} >= TIMESTAMP(@periodStart)
        AND t.${quoteIdentifier(timeFilterColumn)} < TIMESTAMP(@periodEndExclusive)
        AND t.responsables_ids[SAFE_OFFSET(0)] IS NOT NULL
        AND TRIM(t.responsables_ids[SAFE_OFFSET(0)]) != ''
      GROUP BY notion_user_id
    `,
    {
      completedStatuses: payrollCompletedStatuses,
      periodStart,
      periodEndExclusive
    }
  )

  let otdMap = new Map<string, number | null>()

  if (diagnostics.otdAutoAvailable && actualDateColumn && deadlineColumn) {
    const otdRows = await runPayrollQuery<PayrollOtdRow>(
      `
        SELECT
          t.responsables_ids[SAFE_OFFSET(0)] AS notion_user_id,
          ROUND(
            SAFE_MULTIPLY(
              100,
              SAFE_DIVIDE(
                COUNTIF(
                  SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(actualDateColumn)} AS STRING), 1, 10) AS DATE) IS NOT NULL
                  AND SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(deadlineColumn)} AS STRING), 1, 10) AS DATE) IS NOT NULL
                  AND SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(actualDateColumn)} AS STRING), 1, 10) AS DATE)
                    <= SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(deadlineColumn)} AS STRING), 1, 10) AS DATE)
                ),
                COUNTIF(
                  SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(actualDateColumn)} AS STRING), 1, 10) AS DATE) IS NOT NULL
                  AND SAFE_CAST(SUBSTR(CAST(t.${quoteIdentifier(deadlineColumn)} AS STRING), 1, 10) AS DATE) IS NOT NULL
                )
              )
            ),
            2
          ) AS otd_percent
        FROM \`${projectId}.notion_ops.tareas\` AS t
        WHERE t.${quoteIdentifier(statusColumn)} IN UNNEST(@completedStatuses)
          AND t.${quoteIdentifier(timeFilterColumn)} >= TIMESTAMP(@periodStart)
          AND t.${quoteIdentifier(timeFilterColumn)} < TIMESTAMP(@periodEndExclusive)
          AND t.responsables_ids[SAFE_OFFSET(0)] IS NOT NULL
          AND TRIM(t.responsables_ids[SAFE_OFFSET(0)]) != ''
        GROUP BY notion_user_id
      `,
      {
        completedStatuses: payrollCompletedStatuses,
        periodStart,
        periodEndExclusive
      }
    )

    otdMap = new Map<string, number | null>(
      otdRows
        .map(
          row =>
            [String(row.notion_user_id || ''), toNullableNumber(row.otd_percent)] as [string, number | null]
        )
        .filter(([key]) => Boolean(key))
    )
  }

  const snapshots = new Map<string, PayrollKpiSnapshot>()

  for (const row of kpiRows) {
    const notionUserId = String(row.notion_user_id || '').trim()

    if (!notionUserId) {
      continue
    }

    snapshots.set(notionUserId, {
      notionUserId,
      otdPercent: otdMap.get(notionUserId) ?? null,
      rpaAvg: toNullableNumber(row.avg_rpa),
      tasksCompleted: toNumber(row.tasks_completed),
      dataSource: 'notion_ops'
    })
  }

  return {
    snapshots,
    diagnostics
  }
}
