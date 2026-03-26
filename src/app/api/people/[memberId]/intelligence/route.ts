import { NextResponse } from 'next/server'

import { requirePeopleTenantContext } from '@/lib/tenant/authorization'
import { readPersonIntelligence, readPersonIntelligenceTrend } from '@/lib/person-intelligence/store'
import type { PersonIntelligenceResponse } from '@/lib/person-intelligence/types'
import {
  readMemberCapacityEconomicsSnapshot,
  readMemberCapacityEconomicsTrend
} from '@/lib/member-capacity-economics/store'

export const dynamic = 'force-dynamic'

const overlayCapacityEconomics = <
  T extends {
    period: { year: number; month: number }
    capacity: {
      contractedHoursMonth: number
      assignedHoursMonth: number
      usedHoursMonth: number | null
      availableHoursMonth: number
      roleCategory: string | null
      totalFteAllocation: number
      expectedThroughput: number
      capacityHealth: string
      activeAssignmentCount: number
      overcommitted: boolean
      usageKind?: string
      usagePercent?: number | null
      commercialAvailabilityHours?: number
      operationalAvailabilityHours?: number | null
    }
    cost: {
      currency: string | null
      monthlyBaseSalary: number | null
      monthlyTotalComp: number | null
      compensationVersionId: string | null
      targetCurrency?: string | null
      loadedCostTarget?: number | null
      costPerHourTarget?: number | null
      suggestedBillRateTarget?: number | null
    }
    derivedMetrics: Array<{ metricId: string; value: number | null; zone: string | null }>
    materializedAt: string | null
  }
>(snapshot: T, economics: {
  contractedFte: number
  contractedHours: number
  assignedHours: number
  usageKind: string
  usedHours: number | null
  usagePercent: number | null
  commercialAvailabilityHours: number
  operationalAvailabilityHours: number | null
  sourceCurrency: string
  targetCurrency: string
  totalCompSource: number | null
  loadedCostTarget: number | null
  costPerHourTarget: number | null
  suggestedBillRateTarget: number | null
  sourceCompensationVersionId: string | null
  assignmentCount: number
  materializedAt: string | null
} | null) => {
  if (!economics) {
    return snapshot
  }

  const nextDerivedMetrics = snapshot.derivedMetrics.map(metric =>
    metric.metricId === 'cost_per_hour'
      ? { ...metric, value: economics.costPerHourTarget }
      : metric.metricId === 'utilization_pct'
        ? { ...metric, value: economics.usagePercent }
        : metric
  )

  return {
    ...snapshot,
    derivedMetrics: nextDerivedMetrics,
    capacity: {
      ...snapshot.capacity,
      contractedHoursMonth: economics.contractedHours,
      assignedHoursMonth: economics.assignedHours,
      usedHoursMonth: economics.usedHours,
      availableHoursMonth: economics.commercialAvailabilityHours,
      totalFteAllocation: economics.contractedFte,
      activeAssignmentCount: economics.assignmentCount,
      usageKind: economics.usageKind,
      usagePercent: economics.usagePercent,
      commercialAvailabilityHours: economics.commercialAvailabilityHours,
      operationalAvailabilityHours: economics.operationalAvailabilityHours
    },
    cost: {
      ...snapshot.cost,
      currency: economics.sourceCurrency,
      monthlyTotalComp: economics.totalCompSource,
      compensationVersionId: economics.sourceCompensationVersionId,
      targetCurrency: economics.targetCurrency,
      loadedCostTarget: economics.loadedCostTarget,
      costPerHourTarget: economics.costPerHourTarget,
      suggestedBillRateTarget: economics.suggestedBillRateTarget
    },
    materializedAt: economics.materializedAt ?? snapshot.materializedAt
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { memberId } = await params
  const { searchParams } = new URL(request.url)
  const trendMonths = Math.min(24, Math.max(1, Number(searchParams.get('trend') || '6')))

  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const [current, trend, currentEconomics, trendEconomics] = await Promise.all([
      readPersonIntelligence(memberId, year, month),
      readPersonIntelligenceTrend(memberId, trendMonths),
      readMemberCapacityEconomicsSnapshot(memberId, year, month),
      readMemberCapacityEconomicsTrend(memberId, trendMonths)
    ])

    const economicsByPeriod = new Map(
      trendEconomics.map(snapshot => [`${snapshot.periodYear}-${snapshot.periodMonth}`, snapshot] as const)
    )

    const currentOverlay = current ? overlayCapacityEconomics(current, currentEconomics) : null
    const trendOverlay = trend.map(snapshot =>
      overlayCapacityEconomics(
        snapshot,
        economicsByPeriod.get(`${snapshot.period.year}-${snapshot.period.month}`) ?? null
      )
    )

    const response: PersonIntelligenceResponse = {
      memberId,
      current: currentOverlay,
      trend: trendOverlay,
      meta: {
        source: currentOverlay?.source ?? 'person_intelligence',
        materializedAt: currentOverlay?.materializedAt ?? null,
        engineVersion: currentOverlay?.engineVersion ?? 'v2.0.0-person-intelligence'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error(`GET /api/people/${memberId}/intelligence failed:`, error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
