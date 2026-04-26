import 'server-only'

import { randomUUID } from 'node:crypto'

import { getDb } from '@/lib/db'
import { sendSlackAlert } from '@/lib/alerts/slack-notify'
import {
  buildNotionDeliveryDataQualityChecks,
  buildNotionDeliveryDataQualitySummary,
  deriveIntegrationDataQualityStatus
} from '@/lib/integrations/notion-delivery-data-quality-core'
import { getNotionRawFreshnessGate } from '@/lib/integrations/notion-readiness'
import {
  auditDeliveryNotionParity,
  type NotionParityPeriodField
} from '@/lib/space-notion/notion-parity-audit'
import type { Json } from '@/types/db'
import type {
  IntegrationDataQualityCheckResult,
  IntegrationDataQualityFailedCheckSummary,
  IntegrationDataQualityOverview,
  IntegrationDataQualityRunResult,
  IntegrationDataQualitySpaceSnapshot,
  IntegrationDataQualityStatus,
  NotionDeliveryDataQualityRunDetail,
  NotionDeliveryDataQualitySummary,
  RunNotionDeliveryDataQualityInput,
  RunNotionDeliveryDataQualitySweepResult
} from '@/types/integration-data-quality'

/**
 * Check keys whose presence as the *only* failure means the broken state will
 * resolve itself once the conformed Notion sync catches up to raw. Used by the
 * dashboard to downgrade visual severity and by the watcher cron to schedule
 * re-syncs without paging a human.
 */
const AUTO_RECOVERABLE_CHECK_KEYS = new Set<string>([
  'fresh_raw_after_conformed_sync'
])

const classifyRecovery = (
  failedChecks: ReadonlyArray<{ checkKey: string; severity: string }>
): IntegrationDataQualitySpaceSnapshot['recoveryClass'] => {
  if (failedChecks.length === 0) return 'healthy'

  const allTransient = failedChecks.every(check =>
    check.severity === 'ok' || AUTO_RECOVERABLE_CHECK_KEYS.has(check.checkKey)
  )

  return allTransient ? 'auto_recoverable' : 'manual'
}

const INTEGRATION_KEY = 'notion'
const MONITOR_KEY = 'notion_delivery_data_quality'
const PIPELINE_KEY = 'notion_delivery_sync'

type ActiveNotionSpaceRow = {
  spaceId: string
  spaceName: string | null
  clientId: string | null
}

const buildDataQualityRunId = () => `EO-DQR-${randomUUID().slice(0, 8).toUpperCase()}`

const buildDataQualityCheckId = () => `EO-DQC-${randomUUID().slice(0, 8).toUpperCase()}`

const toIsoString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (!trimmed) return null

    const parsed = new Date(trimmed)

    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString()
  }

  return String(value)
}

const toInteger = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0
  if (typeof value === 'bigint') return Number(value)

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
  }

  return 0
}

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

const currentUtcPeriod = () => {
  const now = new Date()

  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1
  }
}

const mapRunRow = (row: {
  data_quality_run_id: string
  integration_key: string
  monitor_key: string
  pipeline_key: string
  space_id: string
  source_sync_run_id: string | null
  execution_source: string
  execution_status: string
  quality_status: string
  period_field: string
  period_year: number
  period_month: number
  total_checks: number
  warning_checks: number
  error_checks: number
  checked_at: Date | string
  completed_at: Date | string | null
  alert_sent_at: Date | string | null
  summary_json: unknown
  metadata: unknown
}): IntegrationDataQualityRunResult => ({
  dataQualityRunId: row.data_quality_run_id,
  integrationKey: row.integration_key,
  monitorKey: row.monitor_key,
  pipelineKey: row.pipeline_key,
  spaceId: row.space_id,
  sourceSyncRunId: row.source_sync_run_id,
  executionSource: row.execution_source as IntegrationDataQualityRunResult['executionSource'],
  executionStatus: row.execution_status as IntegrationDataQualityRunResult['executionStatus'],
  qualityStatus: row.quality_status as IntegrationDataQualityRunResult['qualityStatus'],
  periodField: row.period_field as NotionParityPeriodField,
  periodYear: row.period_year,
  periodMonth: row.period_month,
  totalChecks: row.total_checks,
  warningChecks: row.warning_checks,
  errorChecks: row.error_checks,
  checkedAt: toIsoString(row.checked_at) ?? new Date().toISOString(),
  completedAt: toIsoString(row.completed_at),
  alertSentAt: toIsoString(row.alert_sent_at),
  summary: toRecord(row.summary_json),
  metadata: toRecord(row.metadata)
})

const mapCheckRow = (row: {
  data_quality_check_id: string
  check_key: string
  severity: string
  summary: string
  observed_value: string | null
  expected_value: string | null
  detail_json: unknown
  created_at: Date | string
}): IntegrationDataQualityCheckResult => ({
  dataQualityCheckId: row.data_quality_check_id,
  checkKey: row.check_key,
  severity: row.severity as IntegrationDataQualityCheckResult['severity'],
  summary: row.summary,
  observedValue: row.observed_value,
  expectedValue: row.expected_value,
  detail: toRecord(row.detail_json),
  createdAt: toIsoString(row.created_at) ?? new Date().toISOString()
})

const sendNotionDataQualityAlert = async ({
  qualityStatus,
  spaceName,
  run,
  summary,
  checks
}: {
  qualityStatus: IntegrationDataQualityStatus
  spaceName: string | null
  run: IntegrationDataQualityRunResult
  summary: NotionDeliveryDataQualitySummary
  checks: IntegrationDataQualityCheckResult[]
}) => {
  if (qualityStatus === 'healthy') return false
  if (!['cron', 'post_sync'].includes(run.executionSource)) return false

  const topIssues = checks
    .filter(check => check.severity !== 'ok')
    .slice(0, 5)
    .map(check => `- ${check.checkKey}: ${check.summary}`)
    .join('\n')

  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown'
  const label = qualityStatus === 'broken' ? ':red_circle:' : ':large_yellow_circle:'

  return sendSlackAlert(
    `${label} Notion Delivery data quality ${qualityStatus}\n` +
    `Env: \`${environment}\`\n` +
    `Space: \`${spaceName ?? run.spaceId}\` (\`${run.spaceId}\`)\n` +
    `Periodo: \`${run.periodField} ${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}\`\n` +
    `Run: \`${run.dataQualityRunId}\`\n` +
    `Raw: \`${summary.rawCount}\` · Conformed: \`${summary.conformedCount}\` · Diff: \`${summary.diffCount}\`\n` +
    `${topIssues || '- sin detalle adicional'}`
  )
}

const listActiveNotionSpaces = async (): Promise<ActiveNotionSpaceRow[]> => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.space_notion_sources as sources')
    .innerJoin('greenhouse_core.spaces as spaces', 'spaces.space_id', 'sources.space_id')
    .select([
      'sources.space_id as spaceId',
      'spaces.space_name as spaceName',
      'spaces.client_id as clientId'
    ])
    .where('sources.sync_enabled', '=', true)
    .where('spaces.active', '=', true)
    .orderBy('spaces.space_name', 'asc')
    .execute()

  return rows
}

const insertRunStart = async ({
  dataQualityRunId,
  spaceId,
  executionSource,
  sourceSyncRunId,
  year,
  month,
  periodField
}: {
  dataQualityRunId: string
  spaceId: string
  executionSource: IntegrationDataQualityRunResult['executionSource']
  sourceSyncRunId: string | null
  year: number
  month: number
  periodField: NotionParityPeriodField
}) => {
  const db = await getDb()

  await db
    .insertInto('greenhouse_sync.integration_data_quality_runs')
    .values({
      data_quality_run_id: dataQualityRunId,
      integration_key: INTEGRATION_KEY,
      monitor_key: MONITOR_KEY,
      pipeline_key: PIPELINE_KEY,
      space_id: spaceId,
      source_sync_run_id: sourceSyncRunId,
      execution_source: executionSource,
      execution_status: 'running',
      quality_status: 'unknown',
      period_field: periodField,
      period_year: year,
      period_month: month
    })
    .execute()
}

const completeRun = async ({
  dataQualityRunId,
  qualityStatus,
  checks,
  summary,
  metadata
}: {
  dataQualityRunId: string
  qualityStatus: IntegrationDataQualityStatus
  checks: Array<Omit<IntegrationDataQualityCheckResult, 'dataQualityCheckId' | 'createdAt'>>
  summary: NotionDeliveryDataQualitySummary
  metadata: Record<string, unknown>
}) => {
  const db = await getDb()
  const warningChecks = checks.filter(check => check.severity === 'warning').length
  const errorChecks = checks.filter(check => check.severity === 'error').length

  await db.transaction().execute(async trx => {
    await trx
      .insertInto('greenhouse_sync.integration_data_quality_checks')
      .values(
        checks.map(check => ({
          data_quality_check_id: buildDataQualityCheckId(),
          data_quality_run_id: dataQualityRunId,
          integration_key: INTEGRATION_KEY,
          monitor_key: MONITOR_KEY,
          pipeline_key: PIPELINE_KEY,
          space_id: metadata.spaceId as string,
          check_key: check.checkKey,
          severity: check.severity,
          summary: check.summary,
          observed_value: check.observedValue,
          expected_value: check.expectedValue,
          detail_json: check.detail as unknown as Json
        }))
      )
      .execute()

    await trx
      .updateTable('greenhouse_sync.integration_data_quality_runs')
      .set({
        execution_status: 'completed',
        quality_status: qualityStatus,
        total_checks: checks.length,
        warning_checks: warningChecks,
        error_checks: errorChecks,
        raw_freshness_ready: summary.rawFreshnessReady,
        completed_at: new Date().toISOString(),
        summary_json: summary as unknown as Json,
        metadata: metadata as unknown as Json
      })
      .where('data_quality_run_id', '=', dataQualityRunId)
      .where('space_id', '=', metadata.spaceId as string)
      .execute()
  })
}

const failRun = async ({
  dataQualityRunId,
  spaceId,
  message
}: {
  dataQualityRunId: string
  spaceId: string
  message: string
}) => {
  const db = await getDb()

  await db
    .updateTable('greenhouse_sync.integration_data_quality_runs')
    .set({
      execution_status: 'failed',
      quality_status: 'broken',
      completed_at: new Date().toISOString(),
      summary_json: {
        error: message
      } as unknown as Json,
      metadata: {
        spaceId,
        error: message
      } as unknown as Json
    })
    .where('data_quality_run_id', '=', dataQualityRunId)
    .where('space_id', '=', spaceId)
    .execute()
}

const markRunAlerted = async (dataQualityRunId: string, spaceId: string) => {
  const db = await getDb()

  await db
    .updateTable('greenhouse_sync.integration_data_quality_runs')
    .set({
      alert_sent_at: new Date().toISOString()
    })
    .where('data_quality_run_id', '=', dataQualityRunId)
    .where('space_id', '=', spaceId)
    .execute()
}

const getLatestChecksForRun = async (dataQualityRunId: string, spaceId: string) => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_sync.integration_data_quality_checks')
    .selectAll()
    .where('data_quality_run_id', '=', dataQualityRunId)
    .where('space_id', '=', spaceId)
    .orderBy('created_at', 'asc')
    .execute()

  return rows.map(mapCheckRow)
}

export const runNotionDeliveryDataQuality = async ({
  spaceId,
  year,
  month,
  periodField = 'due_date',
  executionSource = 'manual',
  sourceSyncRunId = null,
  sampleLimit = 25
}: RunNotionDeliveryDataQualityInput): Promise<NotionDeliveryDataQualityRunDetail> => {
  const dataQualityRunId = buildDataQualityRunId()
  const activeSpaces = await listActiveNotionSpaces()
  const currentSpace = activeSpaces.find(space => space.spaceId === spaceId)

  if (!currentSpace) {
    throw new Error(`No active Notion binding found for space ${spaceId}`)
  }

  await insertRunStart({
    dataQualityRunId,
    spaceId,
    executionSource,
    sourceSyncRunId,
    year,
    month,
    periodField
  })

  try {
    const [audit, freshnessGate] = await Promise.all([
      auditDeliveryNotionParity({
        spaceId,
        year,
        month,
        periodField,
        sampleLimit
      }),
      getNotionRawFreshnessGate()
    ])

    const freshnessSpace = freshnessGate.spaces.find(space => space.spaceId === spaceId)
    const rawFreshnessReady = freshnessSpace?.ready ?? false
    const rawFreshnessReasons = freshnessSpace?.reasons ?? ['space no encontrado en freshness gate']

    const summary = buildNotionDeliveryDataQualitySummary({
      audit,
      rawFreshnessReady,
      rawFreshnessReasons
    })

    const checks = buildNotionDeliveryDataQualityChecks({
      audit,
      rawFreshnessReady,
      rawFreshnessReasons
    })

    const qualityStatus = deriveIntegrationDataQualityStatus(checks)

    const metadata = {
      spaceId,
      spaceName: currentSpace.spaceName,
      bucketCounts: audit.summary.bucketCounts,
      conformedSyncedAt: audit.conformedSyncedAt,
      sourceSyncRunId
    }

    await completeRun({
      dataQualityRunId,
      qualityStatus,
      checks,
      summary,
      metadata
    })

    const run = mapRunRow({
      data_quality_run_id: dataQualityRunId,
      integration_key: INTEGRATION_KEY,
      monitor_key: MONITOR_KEY,
      pipeline_key: PIPELINE_KEY,
      space_id: spaceId,
      source_sync_run_id: sourceSyncRunId,
      execution_source: executionSource,
      execution_status: 'completed',
      quality_status: qualityStatus,
      period_field: periodField,
      period_year: year,
      period_month: month,
      total_checks: checks.length,
      warning_checks: checks.filter(check => check.severity === 'warning').length,
      error_checks: checks.filter(check => check.severity === 'error').length,
      checked_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      alert_sent_at: null,
      summary_json: summary,
      metadata
    })

    const persistedChecks = await getLatestChecksForRun(dataQualityRunId, spaceId)

    const alertSent = await sendNotionDataQualityAlert({
      qualityStatus,
      spaceName: currentSpace.spaceName,
      run,
      summary,
      checks: persistedChecks
    })

    if (alertSent) {
      await markRunAlerted(dataQualityRunId, spaceId)
      run.alertSentAt = new Date().toISOString()
    }

    return {
      run,
      checks: persistedChecks,
      summary
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown data quality monitor error'

    await failRun({
      dataQualityRunId,
      spaceId,
      message
    })

    throw error
  }
}

export const runNotionDeliveryDataQualitySweep = async ({
  executionSource = 'cron',
  sourceSyncRunId = null,
  periodField = 'due_date'
}: {
  executionSource?: IntegrationDataQualityRunResult['executionSource']
  sourceSyncRunId?: string | null
  periodField?: NotionParityPeriodField
} = {}): Promise<RunNotionDeliveryDataQualitySweepResult> => {
  const spaces = await listActiveNotionSpaces()
  const period = currentUtcPeriod()
  const runs: NotionDeliveryDataQualityRunDetail[] = []
  let failedSpaces = 0

  for (const space of spaces) {
    try {
      const result = await runNotionDeliveryDataQuality({
        spaceId: space.spaceId,
        year: period.year,
        month: period.month,
        periodField,
        executionSource,
        sourceSyncRunId
      })

      runs.push(result)
    } catch (error) {
      failedSpaces += 1
      console.error('[notion-delivery-data-quality] Failed for space', space.spaceId, error)
    }
  }

  const healthySpaces = runs.filter(run => run.run.qualityStatus === 'healthy').length
  const degradedSpaces = runs.filter(run => run.run.qualityStatus === 'degraded').length
  const brokenSpaces = runs.filter(run => run.run.qualityStatus === 'broken').length

  return {
    integrationKey: INTEGRATION_KEY,
    monitorKey: MONITOR_KEY,
    periodField,
    periodYear: period.year,
    periodMonth: period.month,
    executionSource,
    totalSpaces: spaces.length,
    healthySpaces,
    degradedSpaces,
    brokenSpaces,
    failedSpaces,
    runs
  }
}

export const getNotionDeliveryDataQualityOverview = async ({
  limit = 20
}: {
  limit?: number
} = {}): Promise<IntegrationDataQualityOverview> => {
  const activeSpaces = await listActiveNotionSpaces()
  const spaceIds = activeSpaces.map(space => space.spaceId)

  if (spaceIds.length === 0) {
    return {
      integrationKey: INTEGRATION_KEY,
      monitorKey: MONITOR_KEY,
      generatedAt: new Date().toISOString(),
      totals: {
        totalSpaces: 0,
        healthySpaces: 0,
        degradedSpaces: 0,
        brokenSpaces: 0,
        unknownSpaces: 0,
        autoRecoverableSpaces: 0
      },
      latestBySpace: [],
      recentRuns: []
    }
  }

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_sync.integration_data_quality_runs')
    .selectAll()
    .where('integration_key', '=', INTEGRATION_KEY)
    .where('monitor_key', '=', MONITOR_KEY)
    .where('space_id', 'in', spaceIds)
    .where('execution_status', '=', 'completed')
    .orderBy('checked_at', 'desc')
    .limit(Math.max(limit, spaceIds.length * 6, 30))
    .execute()

  const mappedRuns = rows.map(mapRunRow)
  const nameBySpace = new Map(activeSpaces.map(space => [space.spaceId, space.spaceName]))
  const clientBySpace = new Map(activeSpaces.map(space => [space.spaceId, space.clientId]))
  const latestRunBySpace = new Map<string, IntegrationDataQualityRunResult>()

  for (const run of mappedRuns) {
    if (!latestRunBySpace.has(run.spaceId)) {
      latestRunBySpace.set(run.spaceId, run)
    }
  }

  // Hydrate failed checks for each latest run so the dashboard can show *which*
  // check broke (not just `2 con falla`). One round-trip aggregating across all
  // run IDs — keeps the overview reader cheap.
  const failedChecksByRun = new Map<string, IntegrationDataQualityFailedCheckSummary[]>()

  const latestRunIds = Array.from(latestRunBySpace.values())
    .filter(run => run.qualityStatus === 'broken' || run.qualityStatus === 'degraded')
    .map(run => run.dataQualityRunId)

  if (latestRunIds.length > 0) {
    const checkRows = await db
      .selectFrom('greenhouse_sync.integration_data_quality_checks')
      .select([
        'data_quality_run_id',
        'check_key',
        'severity',
        'summary',
        'observed_value',
        'expected_value'
      ])
      .where('data_quality_run_id', 'in', latestRunIds)
      .where('severity', 'in', ['warning', 'error'])
      .orderBy('severity', 'desc')
      .orderBy('check_key', 'asc')
      .execute()

    for (const row of checkRows) {
      const list = failedChecksByRun.get(row.data_quality_run_id) ?? []
      const observedNum = Number(row.observed_value ?? 0)

      list.push({
        checkKey: row.check_key,
        severity: row.severity as IntegrationDataQualityFailedCheckSummary['severity'],
        count: Number.isFinite(observedNum) ? observedNum : 1,
        observedValue: row.observed_value,
        expectedValue: row.expected_value,
        summary: row.summary
      })
      failedChecksByRun.set(row.data_quality_run_id, list)
    }
  }

  const latestRows: IntegrationDataQualitySpaceSnapshot[] = Array
    .from(latestRunBySpace.values())
    .map(run => {
      const failedChecks = failedChecksByRun.get(run.dataQualityRunId) ?? []
      const recoveryClass = classifyRecovery(failedChecks)

      return {
        spaceId: run.spaceId,
        spaceName: nameBySpace.get(run.spaceId) ?? null,
        clientId: clientBySpace.get(run.spaceId) ?? null,
        qualityStatus: run.qualityStatus,
        checkedAt: run.checkedAt,
        warningChecks: run.warningChecks,
        errorChecks: run.errorChecks,
        diffCount: toInteger(run.summary.diffCount),
        failedChecks,
        recoveryClass
      }
    })
    .sort((left, right) => left.spaceName?.localeCompare(right.spaceName ?? '') ?? 0)

  const totals = {
    totalSpaces: activeSpaces.length,
    healthySpaces: latestRows.filter(row => row.qualityStatus === 'healthy').length,
    degradedSpaces: latestRows.filter(row => row.qualityStatus === 'degraded').length,
    brokenSpaces: latestRows.filter(row => row.qualityStatus === 'broken').length,
    unknownSpaces: activeSpaces.length - latestRows.length,
    autoRecoverableSpaces: latestRows.filter(row => row.recoveryClass === 'auto_recoverable').length
  }

  return {
    integrationKey: INTEGRATION_KEY,
    monitorKey: MONITOR_KEY,
    generatedAt: new Date().toISOString(),
    totals,
    latestBySpace: latestRows,
    recentRuns: mappedRuns.slice(0, limit)
  }
}

export const getTenantNotionDeliveryDataQuality = async ({
  clientId,
  limit = 10
}: {
  clientId: string
  limit?: number
}) => {
  const db = await getDb()

  const space = await db
    .selectFrom('greenhouse_core.spaces')
    .select(['space_id', 'space_name', 'client_id'])
    .where('client_id', '=', clientId)
    .where('active', '=', true)
    .orderBy('created_at', 'asc')
    .executeTakeFirst()

  if (!space) {
    return null
  }

  const rows = await db
    .selectFrom('greenhouse_sync.integration_data_quality_runs')
    .selectAll()
    .where('integration_key', '=', INTEGRATION_KEY)
    .where('monitor_key', '=', MONITOR_KEY)
    .where('space_id', '=', space.space_id)
    .where('execution_status', '=', 'completed')
    .orderBy('checked_at', 'desc')
    .limit(limit)
    .execute()

  const recentRuns = rows.map(mapRunRow)
  const latestRun = recentRuns[0] ?? null

  const latestChecks = latestRun
    ? await getLatestChecksForRun(latestRun.dataQualityRunId, space.space_id)
    : []

  return {
    clientId,
    space: {
      spaceId: space.space_id,
      spaceName: space.space_name
    },
    latestRun,
    latestChecks,
    recentRuns
  }
}
