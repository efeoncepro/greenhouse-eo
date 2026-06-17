import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  readOrganizationOperationalMetricsRow,
  type OrganizationOperationalMetricsRow
} from './organization-operational-metrics-reader'

export interface OrganizationOperationalServing {
  organizationId: string
  hasData: boolean
  source: 'postgres' | 'bigquery' | 'none'
  current: {
    periodYear: number
    periodMonth: number
    tasksCompleted: number
    tasksActive: number
    tasksTotal: number
    rpaAvg: number | null
    rpaMedian: number | null
    otdPct: number | null
    ftrPct: number | null
    cycleTimeAvgDays: number | null
    throughputCount: number | null
    pipelineVelocity: number | null
    stuckAssetCount: number
    stuckAssetPct: number | null
  } | null
  materializedAt: string | null
}

const resolvePeriod = (options?: { periodYear?: number; periodMonth?: number }) => {
  const now = new Date()

  return {
    year: options?.periodYear ?? now.getFullYear(),
    month: options?.periodMonth ?? (now.getMonth() + 1)
  }
}

let ensurePromise: Promise<void> | null = null

export const ensureOrganizationOperationalSchema = async (): Promise<void> => {
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    const rows = await runGreenhousePostgresQuery<{ qualified_name: string }>(
      `
        SELECT schemaname || '.' || tablename AS qualified_name
        FROM pg_tables
        WHERE schemaname = 'greenhouse_serving'
          AND tablename = ANY($1::text[])
      `,
      [['ico_organization_metrics', 'organization_operational_metrics']]
    )

    const existing = new Set(rows.map(row => row.qualified_name))

    const required = [
      'greenhouse_serving.ico_organization_metrics',
      'greenhouse_serving.organization_operational_metrics'
    ]

    const missing = required.filter(name => !existing.has(name))

    if (missing.length > 0) {
      throw new Error(
        `Organization operational schema is not ready. Missing tables: ${missing.join(', ')}. Run pnpm setup:postgres:organization-operational first.`
      )
    }
  })().catch(err => {
    ensurePromise = null
    throw err
  })

  return ensurePromise
}

const mapServingRow = (
  organizationId: string,
  row: OrganizationOperationalMetricsRow
): OrganizationOperationalServing => ({
  organizationId,
  hasData: true,
  source: row.source,
  current: {
    periodYear: row.periodYear,
    periodMonth: row.periodMonth,
    tasksCompleted: row.tasksCompleted,
    tasksActive: row.tasksActive,
    tasksTotal: row.tasksTotal,
    rpaAvg: row.rpaAvg,
    rpaMedian: row.rpaMedian,
    otdPct: row.otdPct,
    ftrPct: row.ftrPct,
    cycleTimeAvgDays: row.cycleTimeAvgDays,
    throughputCount: row.throughputCount,
    pipelineVelocity: row.pipelineVelocity,
    stuckAssetCount: row.stuckAssetCount,
    stuckAssetPct: row.stuckAssetPct
  },
  materializedAt: row.materializedAt
})

export const getOrganizationOperationalServing = async (
  organizationId: string,
  options?: { periodYear?: number; periodMonth?: number }
): Promise<OrganizationOperationalServing> => {
  await ensureOrganizationOperationalSchema().catch(() => {})

  const { year, month } = resolvePeriod(options)

  // Single canonical reader (TASK-1106): operational serving ⊕ ico mirror ⊕ BigQuery. This executive
  // serving surface (Nexa, organization executive) keeps its never-throw degrade contract — a
  // schema-drift error from the reader is already captured to Sentry upstream, so we degrade to the
  // honest "none" state here rather than crashing those consumers.
  const row = await readOrganizationOperationalMetricsRow(organizationId, {
    periodYear: year,
    periodMonth: month
  }).catch((err: unknown) => {
    captureWithDomain(err, 'delivery', { tags: { source: 'account360.executive.operational_serving' } })

    return null
  })

  if (row) return mapServingRow(organizationId, row)

  return { organizationId, hasData: false, source: 'none', current: null, materializedAt: null }
}
