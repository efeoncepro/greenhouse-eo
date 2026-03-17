import { NextResponse } from 'next/server'

import { requireAgencyTenantContext } from '@/lib/tenant/authorization'
import { ensureIcoEngineInfrastructure, ICO_DATASET } from '@/lib/ico-engine/schema'
import { runIcoEngineQuery, getIcoEngineProjectId, toIcoEngineErrorResponse, toNumber, normalizeString } from '@/lib/ico-engine/shared'

export const dynamic = 'force-dynamic'

interface RpaTrendRow {
  space_id: string
  period_year: unknown
  period_month: unknown
  rpa_avg: unknown
  rpa_median: unknown
  tasks_completed: unknown
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureIcoEngineInfrastructure()

    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get('spaceId')
    const months = Math.min(12, Math.max(1, Number(searchParams.get('months') || '6')))
    const projectId = getIcoEngineProjectId()

    // Compute cutoff date
    const cutoff = new Date()

    cutoff.setMonth(cutoff.getMonth() - months)

    const cutoffYear = cutoff.getFullYear()
    const cutoffMonth = cutoff.getMonth() + 1

    let filter = 'WHERE (period_year > @cutoffYear OR (period_year = @cutoffYear AND period_month >= @cutoffMonth))'
    const params: Record<string, unknown> = { cutoffYear, cutoffMonth }

    if (spaceId) {
      filter += ' AND space_id = @spaceId'
      params.spaceId = spaceId
    }

    const rows = await runIcoEngineQuery<RpaTrendRow>(`
      SELECT space_id, period_year, period_month, rpa_avg, rpa_median, tasks_completed
      FROM \`${projectId}.${ICO_DATASET}.rpa_trend\`
      ${filter}
      ORDER BY space_id, period_year, period_month
    `, params)

    // Group by space
    const bySpace = new Map<string, Array<{
      periodYear: number
      periodMonth: number
      rpaAvg: number | null
      rpaMedian: number | null
      tasksCompleted: number
    }>>()

    for (const row of rows) {
      const sid = normalizeString(row.space_id)

      if (!bySpace.has(sid)) {
        bySpace.set(sid, [])
      }

      bySpace.get(sid)!.push({
        periodYear: toNumber(row.period_year),
        periodMonth: toNumber(row.period_month),
        rpaAvg: row.rpa_avg !== null && row.rpa_avg !== undefined ? toNumber(row.rpa_avg) : null,
        rpaMedian: row.rpa_median !== null && row.rpa_median !== undefined ? toNumber(row.rpa_median) : null,
        tasksCompleted: toNumber(row.tasks_completed)
      })
    }

    const spaces = Array.from(bySpace.entries()).map(([sid, periods]) => ({
      spaceId: sid,
      periods
    }))

    return NextResponse.json({ months, spaces })
  } catch (error) {
    return toIcoEngineErrorResponse(error, 'Failed to read RPA trend data')
  }
}
