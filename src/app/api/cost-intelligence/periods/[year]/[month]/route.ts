import { NextResponse } from 'next/server'

import { checkPeriodReadiness } from '@/lib/cost-intelligence/check-period-readiness'
import { CostIntelligenceValidationError } from '@/lib/cost-intelligence/shared'
import { requireCostIntelligenceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const { tenant, errorResponse } = await requireCostIntelligenceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { year, month } = await params

    const detail = await checkPeriodReadiness({
      year: Number(year),
      month: Number(month)
    })

    return NextResponse.json(detail)
  } catch (error) {
    const statusCode = error instanceof CostIntelligenceValidationError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Unable to read period closure status.'

    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
