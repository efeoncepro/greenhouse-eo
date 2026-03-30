import { NextResponse } from 'next/server'

import { closePeriod } from '@/lib/cost-intelligence/close-period'
import { CostIntelligenceValidationError } from '@/lib/cost-intelligence/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  _: Request,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { year, month } = await params
    const actor = tenant.userId || 'unknown'

    const result = await closePeriod({
      year: Number(year),
      month: Number(month),
      actor
    })

    return NextResponse.json(result)
  } catch (error) {
    const statusCode = error instanceof CostIntelligenceValidationError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Unable to close cost intelligence period.'

    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
