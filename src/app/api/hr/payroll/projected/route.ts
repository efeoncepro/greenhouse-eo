import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { projectPayrollForPeriod, type ProjectionMode } from '@/lib/payroll/project-payroll'

export const dynamic = 'force-dynamic'

type OfficialEntryRow = {
  member_id: string
  currency: string
  gross_total: number | string
  net_total: number | string
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
    const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

    const year = Number(searchParams.get('year')) || (match ? Number(match[1]) : new Date().getFullYear())
    const month = Number(searchParams.get('month')) || (match ? Number(match[2]) : new Date().getMonth() + 1)
    const mode = (searchParams.get('mode') || 'projected_month_end') as ProjectionMode

    if (mode !== 'actual_to_date' && mode !== 'projected_month_end') {
      return NextResponse.json({ error: 'Invalid mode. Use actual_to_date or projected_month_end.' }, { status: 400 })
    }

    // Fetch projection + official entries in parallel
    const periodId = `${year}-${String(month).padStart(2, '0')}`

    const [result, officialRows] = await Promise.all([
      projectPayrollForPeriod({ year, month, mode }),
      runGreenhousePostgresQuery<OfficialEntryRow>(
        `SELECT e.member_id, e.currency, e.gross_total, e.net_total
         FROM greenhouse_hr.payroll_entries e
         INNER JOIN greenhouse_hr.payroll_periods p ON p.period_id = e.period_id
         WHERE p.period_id = $1
           AND p.status IN ('calculated', 'approved', 'exported')`,
        [periodId]
      ).catch(() => [] as OfficialEntryRow[])
    ])

    // Build official map
    const officialByMember = new Map<string, { grossTotal: number; netTotal: number }>()

    for (const row of officialRows) {
      officialByMember.set(row.member_id, {
        grossTotal: Number(row.gross_total),
        netTotal: Number(row.net_total)
      })
    }

    // Compute delta
    const officialGrossByCurrency: Record<string, number> = {}
    const officialNetByCurrency: Record<string, number> = {}

    for (const row of officialRows) {
      officialGrossByCurrency[row.currency] = (officialGrossByCurrency[row.currency] ?? 0) + Number(row.gross_total)
      officialNetByCurrency[row.currency] = (officialNetByCurrency[row.currency] ?? 0) + Number(row.net_total)
    }

    const hasOfficial = officialRows.length > 0

    // Enrich entries with delta
    const entriesWithDelta = result.entries.map(entry => {
      const official = officialByMember.get(entry.memberId)

      return {
        ...entry,
        officialGrossTotal: official?.grossTotal ?? null,
        officialNetTotal: official?.netTotal ?? null,
        deltaGross: official ? Math.round((entry.grossTotal - official.grossTotal) * 100) / 100 : null,
        deltaNet: official ? Math.round((entry.netTotal - official.netTotal) * 100) / 100 : null
      }
    })

    return NextResponse.json(
      {
        ...result,
        entries: entriesWithDelta,
        official: hasOfficial ? {
          grossByCurrency: officialGrossByCurrency,
          netByCurrency: officialNetByCurrency,
          entryCount: officialRows.length
        } : null
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  } catch (error) {
    console.error('GET /api/hr/payroll/projected failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
