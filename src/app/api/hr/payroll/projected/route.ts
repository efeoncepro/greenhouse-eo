import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { projectPayrollForPeriod, type ProjectionMode } from '@/lib/payroll/project-payroll'

export const dynamic = 'force-dynamic'

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

    const result = await projectPayrollForPeriod({ year, month, mode })

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    })
  } catch (error) {
    console.error('GET /api/hr/payroll/projected failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
