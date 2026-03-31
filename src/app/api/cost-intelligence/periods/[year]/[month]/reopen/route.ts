import { NextResponse } from 'next/server'

import { reopenPeriod } from '@/lib/cost-intelligence/reopen-period'
import { CostIntelligenceValidationError } from '@/lib/cost-intelligence/shared'
import { canReopenCostIntelligencePeriod, requireCostIntelligenceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const { tenant, errorResponse } = await requireCostIntelligenceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!canReopenCostIntelligencePeriod(tenant)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => null) as { reason?: unknown } | null
    const reason = typeof body?.reason === 'string' ? body.reason : ''
    const { year, month } = await params
    const actor = tenant.userId || 'unknown'

    const result = await reopenPeriod({
      year: Number(year),
      month: Number(month),
      actor,
      reason
    })

    return NextResponse.json(result)
  } catch (error) {
    const statusCode = error instanceof CostIntelligenceValidationError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Unable to reopen cost intelligence period.'

    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
