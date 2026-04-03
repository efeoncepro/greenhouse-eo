import { NextResponse } from 'next/server'

import { alertCronFailure } from '@/lib/alerts/slack-notify'
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

import { materializeMonthlySnapshots } from '@/lib/ico-engine/materialize'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const getRollingPeriods = (monthsBack: number) => {
  const periods: Array<{ year: number; month: number }> = []
  const now = new Date()

  for (let index = 0; index < monthsBack; index++) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)

    periods.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1
    })
  }

  return periods
}

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)

  if (!authorized) {
    return errorResponse
  }

  try {
    const { searchParams } = new URL(request.url)
    const requestedMonthsBack = Number(searchParams.get('monthsBack') || '3')

    const monthsBack = Number.isInteger(requestedMonthsBack)
      ? Math.min(Math.max(requestedMonthsBack, 1), 6)
      : 3

    const periods = getRollingPeriods(monthsBack)
    const results = []

    for (const period of periods) {
      results.push(await materializeMonthlySnapshots(period.year, period.month))
    }

    const result = {
      periods: periods.map(period => `${period.year}-${String(period.month).padStart(2, '0')}`),
      monthsBack,
      spacesProcessed: results.reduce((sum, item) => sum + item.spacesProcessed, 0),
      snapshotsWritten: results.reduce((sum, item) => sum + item.snapshotsWritten, 0),
      stuckAssetsWritten: results.reduce((sum, item) => sum + item.stuckAssetsWritten, 0),
      rpaTrendRowsWritten: results.reduce((sum, item) => sum + item.rpaTrendRowsWritten, 0),
      projectMetricsWritten: results.reduce((sum, item) => sum + item.projectMetricsWritten, 0),
      memberMetricsWritten: results.reduce((sum, item) => sum + item.memberMetricsWritten, 0),
      sprintMetricsWritten: results.reduce((sum, item) => sum + item.sprintMetricsWritten, 0),
      organizationMetricsWritten: results.reduce((sum, item) => sum + item.organizationMetricsWritten, 0),
      businessUnitMetricsWritten: results.reduce((sum, item) => sum + item.businessUnitMetricsWritten, 0),
      performanceReportsWritten: results.reduce((sum, item) => sum + item.performanceReportsWritten, 0),
      durationMs: results.reduce((sum, item) => sum + item.durationMs, 0),
      engineVersion: results[0]?.engineVersion ?? 'unknown',
      results
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('ICO materialization failed:', error)
    await alertCronFailure('ico-materialize', error)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
