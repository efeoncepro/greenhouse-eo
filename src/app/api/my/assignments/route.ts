import { NextResponse } from 'next/server'

import { requireMyTenantContext } from '@/lib/tenant/authorization'
import { getPersonFinanceOverviewFromPostgres } from '@/lib/person-360/get-person-finance'
import {
  readLatestMemberCapacityEconomicsSnapshot,
  readMemberCapacityEconomicsSnapshot
} from '@/lib/member-capacity-economics/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
    const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)
    const year = match ? Number(match[1]) : new Date().getFullYear()
    const month = match ? Number(match[2]) : new Date().getMonth() + 1

    const [overview, currentSnapshot, latestSnapshot] = await Promise.all([
      getPersonFinanceOverviewFromPostgres(memberId),
      readMemberCapacityEconomicsSnapshot(memberId, year, month).catch(() => null),
      readLatestMemberCapacityEconomicsSnapshot(memberId).catch(() => null)
    ])

    const snapshot = currentSnapshot ?? latestSnapshot

    return NextResponse.json({
      assignments: overview?.assignments ?? [],
      summary: overview?.summary ?? null,
      capacity: snapshot
        ? {
            periodYear: snapshot.periodYear,
            periodMonth: snapshot.periodMonth,
            contractedFte: snapshot.contractedFte,
            contractedHours: snapshot.contractedHours,
            assignedHours: snapshot.assignedHours,
            usageKind: snapshot.usageKind,
            usedHours: snapshot.usedHours,
            usagePercent: snapshot.usagePercent,
            commercialAvailabilityHours: snapshot.commercialAvailabilityHours,
            operationalAvailabilityHours: snapshot.operationalAvailabilityHours,
            targetCurrency: snapshot.targetCurrency,
            costPerHourTarget: snapshot.costPerHourTarget,
            suggestedBillRateTarget: snapshot.suggestedBillRateTarget
          }
        : null
    })
  } catch (error) {
    console.error('GET /api/my/assignments failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
