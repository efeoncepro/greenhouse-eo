import 'server-only'

import { getMicrocopy } from '@/lib/copy'
import { captureWithDomain } from '@/lib/observability/capture'
import { readMemberAiLlmSummary } from '@/lib/ico-engine/ai/llm-enrichment-reader'
import type { MemberNexaInsightsPayload } from '@/lib/ico-engine/ai/llm-types'
import { ensureIcoEngineInfrastructure } from '@/lib/ico-engine/schema'
import {
  computeMetricsByContext,
  readMemberMetrics,
  type IcoMetricSnapshot
} from '@/lib/ico-engine/read-metrics'
import { getPersonIcoProfile } from '@/lib/person-360/get-person-ico-profile'
import { getPersonOperationalServing } from '@/lib/person-360/get-person-operational-serving'

/**
 * Self-service performance DTO — TASK-1027.
 *
 * Canonical product reader for the collaborator-facing `/my/performance` surface.
 * Server-side only. Composes ONLY cost-free readers so compensation/cost fields
 * are redacted BY CONSTRUCTION — the leaky `readPersonIntelligence(Trend)` readers
 * (which carry `cost.{monthlyBaseSalary,monthlyTotalComp,compensationVersionId,
 * loadedCostTarget,costPerHourTarget,suggestedBillRateTarget}`) are never imported here.
 *
 * Subject is always resolved by the caller from the session (`requireMyTenantContext`).
 * This composer NEVER accepts a target member identifier from the client.
 *
 * Reusable for a future first-party app API (`api/platform/app/*`) per
 * GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1 self-critique.
 */

export type MyPerformancePeriodStatus =
  | 'current_partial'
  | 'closed_snapshot'
  | 'no_data'
  | 'degraded'

export type MyPerformanceDegradedSource = 'ico' | 'trend' | 'operational' | 'nexa'

export interface MyPerformanceMetric {
  metricId: string
  value: number | null
  zone: string | null
}

export interface MyPerformanceCscEntry {
  phase: string
  label: string
  count: number
  pct: number
}

export interface MyPerformanceTrendPoint {
  periodYear: number
  periodMonth: number
  otdPct: number | null
  ftrPct: number | null
}

export interface MyPerformanceIco {
  hasData: boolean
  metrics: MyPerformanceMetric[]
  context: {
    totalTasks: number
    completedTasks: number
    activeTasks: number
    carryOverTasks: number
  }
  cscDistribution: MyPerformanceCscEntry[]
}

export interface MyPerformanceOperational {
  tasksCompleted: number
  tasksActive: number
  stuckAssetCount: number
}

export interface MyPerformanceResponse {
  subject: {
    memberId: string
  }
  period: {
    year: number
    month: number
    label: string
    isCurrentPeriod: boolean
    status: MyPerformancePeriodStatus
  }
  ico: MyPerformanceIco | null
  trend: MyPerformanceTrendPoint[]
  nexaInsights: MemberNexaInsightsPayload | null
  operational: MyPerformanceOperational | null
  meta: {
    materializedAt: string | null
    degradedSources: MyPerformanceDegradedSource[]
  }
}

export interface ComposeMyPerformanceInput {
  memberId: string
  year: number
  month: number
}

/** Current operational period in canonical base timezone (America/Santiago). */
export const resolveCurrentSantiagoPeriod = (): { year: number; month: number } => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  if (!match) {
    const now = new Date()

    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }

  return { year: Number(match[1]), month: Number(match[2]) }
}

const buildPeriodLabel = (year: number, month: number): string => {
  const monthName = getMicrocopy().months.long[month - 1] ?? String(month)

  return `${monthName} ${year}`
}

const projectIco = (snapshot: IcoMetricSnapshot | null): MyPerformanceIco | null => {
  if (!snapshot) return null

  const hasData = snapshot.context.totalTasks > 0 || snapshot.metrics.some(m => m.value !== null)

  return {
    hasData,
    // Safe projection: only the presentation-relevant fields. No cost/trust internals.
    metrics: snapshot.metrics.map(m => ({ metricId: m.metricId, value: m.value, zone: m.zone })),
    context: {
      totalTasks: snapshot.context.totalTasks,
      completedTasks: snapshot.context.completedTasks,
      activeTasks: snapshot.context.activeTasks,
      carryOverTasks: snapshot.context.carryOverTasks
    },
    cscDistribution: snapshot.cscDistribution.map(c => ({
      phase: c.phase,
      label: c.label,
      count: c.count,
      pct: c.pct
    }))
  }
}

/** Member-scoped ICO snapshot: materialized cache first, live compute fallback. */
const resolveIcoSnapshot = async (
  memberId: string,
  year: number,
  month: number
): Promise<IcoMetricSnapshot | null> => {
  const cached = await readMemberMetrics(memberId, year, month)

  if (cached) return cached

  return computeMetricsByContext('member', memberId, year, month)
}

const isNexaEmpty = (nexa: MemberNexaInsightsPayload | null): boolean =>
  !nexa || nexa.totalAnalyzed === 0

/**
 * Compose the redacted self-service performance DTO for the resolved subject.
 *
 * Degrades honestly: a failing source is recorded in `meta.degradedSources[]`
 * (and surfaced via `period.status='degraded'`) instead of throwing — the surface
 * is read-only and ordinary no-data must not raise noisy alerts.
 */
export const composeMyPerformance = async ({
  memberId,
  year,
  month
}: ComposeMyPerformanceInput): Promise<MyPerformanceResponse> => {
  // Non-fatal: ICO BQ infra ensure mirrors the agency context path. If it fails,
  // the ICO source promise degrades like any other source.
  try {
    await ensureIcoEngineInfrastructure()
  } catch (error) {
    captureWithDomain(error, 'delivery', {
      tags: { source: 'my_performance_dto', stage: 'ensure_ico_infra' }
    })
  }

  const [icoResult, trendResult, operationalResult, nexaResult] = await Promise.allSettled([
    resolveIcoSnapshot(memberId, year, month),
    getPersonIcoProfile(memberId, 6),
    getPersonOperationalServing(memberId),
    readMemberAiLlmSummary(memberId, year, month)
  ])

  const degradedSources: MyPerformanceDegradedSource[] = []

  const ico = icoResult.status === 'fulfilled' ? projectIco(icoResult.value) : null

  if (icoResult.status === 'rejected') {
    degradedSources.push('ico')
    captureWithDomain(icoResult.reason, 'delivery', {
      tags: { source: 'my_performance_dto', stage: 'ico_snapshot' }
    })
  }

  const trend: MyPerformanceTrendPoint[] =
    trendResult.status === 'fulfilled'
      ? trendResult.value.trend.map(p => ({
          periodYear: p.periodYear,
          periodMonth: p.periodMonth,
          otdPct: p.otdPct,
          ftrPct: p.ftrPct
        }))
      : []

  if (trendResult.status === 'rejected') {
    degradedSources.push('trend')
    captureWithDomain(trendResult.reason, 'delivery', {
      tags: { source: 'my_performance_dto', stage: 'trend' }
    })
  }

  const operationalCurrent =
    operationalResult.status === 'fulfilled' ? operationalResult.value.current : null

  const operational: MyPerformanceOperational | null = operationalCurrent
    ? {
        tasksCompleted: operationalCurrent.tasksCompleted,
        tasksActive: operationalCurrent.tasksActive,
        stuckAssetCount: operationalCurrent.stuckAssetCount
      }
    : null

  if (operationalResult.status === 'rejected') {
    degradedSources.push('operational')
    captureWithDomain(operationalResult.reason, 'delivery', {
      tags: { source: 'my_performance_dto', stage: 'operational' }
    })
  }

  const nexaInsights = nexaResult.status === 'fulfilled' ? nexaResult.value : null

  if (nexaResult.status === 'rejected') {
    degradedSources.push('nexa')
    captureWithDomain(nexaResult.reason, 'delivery', {
      tags: { source: 'my_performance_dto', stage: 'nexa' }
    })
  }

  const current = resolveCurrentSantiagoPeriod()
  const isCurrentPeriod = year === current.year && month === current.month

  const hasAnyData = Boolean(ico?.hasData) || operational !== null || !isNexaEmpty(nexaInsights)

  let status: MyPerformancePeriodStatus

  if (degradedSources.length > 0) {
    status = 'degraded'
  } else if (!hasAnyData) {
    status = 'no_data'
  } else if (isCurrentPeriod) {
    status = 'current_partial'
  } else {
    status = 'closed_snapshot'
  }

  const materializedAt =
    (icoResult.status === 'fulfilled' ? icoResult.value?.computedAt ?? null : null) ??
    (operationalResult.status === 'fulfilled' ? operationalResult.value.materializedAt : null) ??
    nexaInsights?.lastAnalysis ??
    null

  return {
    subject: { memberId },
    period: {
      year,
      month,
      label: buildPeriodLabel(year, month),
      isCurrentPeriod,
      status
    },
    ico,
    trend,
    nexaInsights,
    operational,
    meta: {
      materializedAt,
      degradedSources
    }
  }
}
