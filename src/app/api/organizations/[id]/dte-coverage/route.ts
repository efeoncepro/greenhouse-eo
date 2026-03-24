import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { getDteCoverage } from '@/lib/finance/dte-coverage'

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations/[id]/dte-coverage
 * Returns DTE coverage metrics for an organization in a given period.
 *
 * Query params:
 *   - year: period year (default: current year)
 *   - month: period month (default: current month)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)

  const now = new Date()
  const year = Number(searchParams.get('year')) || now.getFullYear()
  const month = Number(searchParams.get('month')) || now.getMonth() + 1

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: 'month must be between 1 and 12' }, { status: 400 })
  }

  try {
    const coverage = await getDteCoverage(id, year, month)

    return NextResponse.json(coverage)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
