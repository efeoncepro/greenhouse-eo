import 'server-only'

import type { PayrollKpiDiagnostics, PayrollKpiSnapshot } from '@/types/payroll'

import { computeMetricsByContext, readMemberMetricsBatch } from '@/lib/ico-engine/read-metrics'
import { ensureIcoEngineInfrastructure } from '@/lib/ico-engine/schema'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

type FetchKpisInput = {
  memberIds: Array<string | null | undefined>
  periodYear: number
  periodMonth: number
}

/**
 * TASK-910 Slice 5 — Defense in depth canonical: filter demo members
 * (members.is_demo = TRUE) ANTES de entrar al path payroll.
 *
 * Si emerge un demo member en el input (bug upstream o manual SQL bypass),
 * capturamos via Sentry tags 'payroll' + 'demo_member_in_payroll_input' para
 * que operator vea + reliability signal `payroll.bonus.demo_member_contamination`
 * (Slice 4) alerta el incidente. NO crasheamos — degradamos honesto skipping
 * demo members del path.
 *
 * Pattern fuente: TASK-872 workforce_intake_status filter (mismo concept:
 * filter members en el boundary del payroll path).
 */
const filterOutDemoMembers = async (memberIds: readonly string[]): Promise<string[]> => {
  if (memberIds.length === 0) return []

  try {
    const demoRows = await runGreenhousePostgresQuery<{ member_id: string }>(
      `SELECT member_id
       FROM greenhouse_core.members
       WHERE member_id = ANY($1::text[])
         AND is_demo = TRUE`,
      [memberIds]
    )

    if (demoRows.length === 0) {
      return [...memberIds]
    }

    const demoMemberIds = new Set(demoRows.map(row => row.member_id))

    // Alert upstream bug: demo member entró al payroll input
    captureWithDomain(
      new Error(`Demo members detectados en payroll input: ${demoRows.map(r => r.member_id).join(', ')}`),
      'payroll',
      {
        level: 'warning',
        tags: {
          source: 'fetch_kpis_for_period',
          stage: 'demo_member_filter'
        },
        extra: {
          demoMemberCount: demoMemberIds.size,
          totalMemberCount: memberIds.length,
          demoMemberIds: Array.from(demoMemberIds)
        }
      }
    )

    return memberIds.filter(id => !demoMemberIds.has(id))
  } catch (err) {
    // PG failure — degradar honesto. NO devolver demo members por accidente.
    captureWithDomain(err, 'payroll', {
      level: 'error',
      tags: { source: 'fetch_kpis_for_period', stage: 'demo_filter_failed' }
    })

    // Conservative: si filter falla, return original list (filtering en helper
    // bonus pre-check Slice 5b dual sigue actuando como safety net).
    return [...memberIds]
  }
}

const getMetricValue = (
  snapshot: { metrics: Array<{ metricId: string; value: number | null }> },
  metricId: string
) => snapshot.metrics.find(metric => metric.metricId === metricId)?.value ?? null

const getMetric = (
  snapshot: {
    metrics: Array<{
      metricId: string
      value: number | null
      dataStatus?: PayrollKpiSnapshot['rpaDataStatus']
      confidenceLevel?: PayrollKpiSnapshot['rpaConfidenceLevel']
      suppressionReason?: PayrollKpiSnapshot['rpaSuppressionReason']
      evidence?: PayrollKpiSnapshot['rpaEvidence']
    }>
  },
  metricId: string
) => snapshot.metrics.find(metric => metric.metricId === metricId) ?? null

export const fetchKpisForPeriod = async ({
  memberIds,
  periodYear,
  periodMonth
}: FetchKpisInput): Promise<{
  snapshots: Map<string, PayrollKpiSnapshot>
  diagnostics: PayrollKpiDiagnostics
}> => {
  const uniqueMemberIds = Array.from(
    new Set(
      memberIds
        .map(memberId => (typeof memberId === 'string' ? memberId.trim() : ''))
        .filter(Boolean)
    )
  )

  const diagnostics: PayrollKpiDiagnostics = {
    source: 'ico',
    strategy: 'materialized_first_with_live_fallback',
    periodYear,
    periodMonth,
    materializedMembers: 0,
    liveComputedMembers: 0,
    missingMembers: 0
  }

  if (uniqueMemberIds.length === 0) {
    return {
      snapshots: new Map<string, PayrollKpiSnapshot>(),
      diagnostics
    }
  }

  // TASK-910 Slice 5 — Defense in depth canonical: filter demo members ANTES
  // de entrar al path payroll (BQ readMemberMetricsBatch + computeMetricsByContext).
  // Demo members NUNCA llegan al bonus calc downstream — el filter es la primera
  // capa, el pre-check en bonus helpers (calculateRpaBonus/calculateOtdBonus)
  // es la segunda capa (defense in depth dual).
  //
  // Si algún demo member entra al input, lo capturamos via Sentry para que
  // operador vea el upstream bug, pero NO crasheamos — degradamos honestamente
  // skipping demo members del payroll path.
  const filteredMemberIds = await filterOutDemoMembers(uniqueMemberIds)

  if (filteredMemberIds.length === 0) {
    return {
      snapshots: new Map<string, PayrollKpiSnapshot>(),
      diagnostics
    }
  }

  await ensureIcoEngineInfrastructure()

  const materializedSnapshots = await readMemberMetricsBatch(filteredMemberIds, periodYear, periodMonth)
  const snapshots = new Map<string, PayrollKpiSnapshot>()

  for (const [memberId, snapshot] of materializedSnapshots.entries()) {
    const rpaMetric = getMetric(snapshot, 'rpa')

    snapshots.set(memberId, {
      memberId,
      otdPercent: getMetricValue(snapshot, 'otd_pct'),
      rpaAvg: rpaMetric?.value ?? null,
      rpaDataStatus: rpaMetric?.dataStatus ?? null,
      rpaConfidenceLevel: rpaMetric?.confidenceLevel ?? null,
      rpaSuppressionReason: rpaMetric?.suppressionReason ?? null,
      rpaEvidence: rpaMetric?.evidence ?? null,
      tasksCompleted: snapshot.context.completedTasks,
      dataSource: 'ico',
      sourceMode: 'materialized'
    })
  }

  diagnostics.materializedMembers = snapshots.size

  const missingMemberIds = filteredMemberIds.filter(memberId => !snapshots.has(memberId))

  if (missingMemberIds.length > 0) {
    const liveResults = await Promise.all(
      missingMemberIds.map(async memberId => {
        const liveSnapshot = await computeMetricsByContext('member', memberId, periodYear, periodMonth)

        return { memberId, liveSnapshot }
      })
    )

    for (const { memberId, liveSnapshot } of liveResults) {
      if (!liveSnapshot) {
        diagnostics.missingMembers += 1
        continue
      }

      const rpaMetric = getMetric(liveSnapshot, 'rpa')

      snapshots.set(memberId, {
        memberId,
        otdPercent: getMetricValue(liveSnapshot, 'otd_pct'),
        rpaAvg: rpaMetric?.value ?? null,
        rpaDataStatus: rpaMetric?.dataStatus ?? null,
        rpaConfidenceLevel: rpaMetric?.confidenceLevel ?? null,
        rpaSuppressionReason: rpaMetric?.suppressionReason ?? null,
        rpaEvidence: rpaMetric?.evidence ?? null,
        tasksCompleted: liveSnapshot.context.completedTasks,
        dataSource: 'ico',
        sourceMode: 'live'
      })
      diagnostics.liveComputedMembers += 1
    }
  }

  return {
    snapshots,
    diagnostics
  }
}
