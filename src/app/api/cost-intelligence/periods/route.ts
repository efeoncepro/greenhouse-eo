import { NextResponse } from 'next/server'

import { checkPeriodReadiness, listRecentClosurePeriods } from '@/lib/cost-intelligence/check-period-readiness'
import { CostIntelligenceValidationError, toInteger } from '@/lib/cost-intelligence/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.max(1, Math.min(24, toInteger(searchParams.get('limit')) ?? 12))
    const periods = await listRecentClosurePeriods(limit)
    const items = await Promise.all(periods.map(period => checkPeriodReadiness(period)))

    return NextResponse.json({ items })
  } catch (error) {
    const statusCode = error instanceof CostIntelligenceValidationError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Unable to list cost intelligence periods.'

    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

