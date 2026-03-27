import 'server-only'

import type { PayrollKpiDiagnostics, PayrollKpiSnapshot } from '@/types/payroll'

import { computeMetricsByContext, readMemberMetricsBatch } from '@/lib/ico-engine/read-metrics'
import { ensureIcoEngineInfrastructure } from '@/lib/ico-engine/schema'

type FetchKpisInput = {
  memberIds: Array<string | null | undefined>
  periodYear: number
  periodMonth: number
}

const getMetricValue = (
  snapshot: { metrics: Array<{ metricId: string; value: number | null }> },
  metricId: string
) => snapshot.metrics.find(metric => metric.metricId === metricId)?.value ?? null

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

  await ensureIcoEngineInfrastructure()

  const materializedSnapshots = await readMemberMetricsBatch(uniqueMemberIds, periodYear, periodMonth)
  const snapshots = new Map<string, PayrollKpiSnapshot>()

  for (const [memberId, snapshot] of materializedSnapshots.entries()) {
    snapshots.set(memberId, {
      memberId,
      otdPercent: getMetricValue(snapshot, 'otd_pct'),
      rpaAvg: getMetricValue(snapshot, 'rpa'),
      tasksCompleted: snapshot.context.completedTasks,
      dataSource: 'ico',
      sourceMode: 'materialized'
    })
  }

  diagnostics.materializedMembers = snapshots.size

  const missingMemberIds = uniqueMemberIds.filter(memberId => !snapshots.has(memberId))

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

      snapshots.set(memberId, {
        memberId,
        otdPercent: getMetricValue(liveSnapshot, 'otd_pct'),
        rpaAvg: getMetricValue(liveSnapshot, 'rpa'),
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
