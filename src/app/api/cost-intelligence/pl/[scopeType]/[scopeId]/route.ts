import { NextResponse } from 'next/server'

import { getOperationalPlTrend } from '@/lib/cost-intelligence/compute-operational-pl'
import type { OperationalPlScopeType } from '@/lib/cost-intelligence/pl-types'
import { requireCostIntelligenceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const isScopeType = (value: string): value is OperationalPlScopeType =>
  value === 'client' || value === 'space' || value === 'organization'

export async function GET(
  request: Request,
  context: { params: Promise<{ scopeType: string; scopeId: string }> }
) {
  const { tenant, errorResponse } = await requireCostIntelligenceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { scopeType, scopeId } = await context.params

  if (!isScopeType(scopeType)) {
    return NextResponse.json({ error: 'Invalid scopeType' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const months = Math.max(1, Math.min(Number(searchParams.get('months')) || 6, 24))
  const result = await getOperationalPlTrend({ scopeType, scopeId, months })

  return NextResponse.json({
    scopeType,
    scopeId,
    months,
    ...result
  })
}
