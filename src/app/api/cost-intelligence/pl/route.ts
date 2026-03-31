import { NextResponse } from 'next/server'

import { listOperationalPlSnapshots } from '@/lib/cost-intelligence/compute-operational-pl'
import type { OperationalPlScopeType } from '@/lib/cost-intelligence/pl-types'
import { CostIntelligenceValidationError, toBoolean, toInteger, toNullableString } from '@/lib/cost-intelligence/shared'
import { requireCostIntelligenceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const isScopeType = (value: string | null): value is OperationalPlScopeType =>
  value === 'client' || value === 'space' || value === 'organization'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireCostIntelligenceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const year = toInteger(searchParams.get('year'))
    const month = toInteger(searchParams.get('month'))
    const scopeTypeRaw = searchParams.get('scopeType')
    const scopeType = isScopeType(scopeTypeRaw) ? scopeTypeRaw : undefined
    const scopeId = toNullableString(searchParams.get('scopeId')) ?? undefined

    const periodClosed = searchParams.has('periodClosed')
      ? toBoolean(searchParams.get('periodClosed'), false)
      : undefined

    const limit = Math.max(1, Math.min(500, toInteger(searchParams.get('limit')) ?? 200))

    const snapshots = await listOperationalPlSnapshots({
      year: year ?? undefined,
      month: month ?? undefined,
      scopeType,
      scopeId,
      periodClosed,
      limit
    })

    return NextResponse.json({
      filters: {
        year,
        month,
        scopeType: scopeType ?? null,
        scopeId: scopeId ?? null,
        periodClosed: periodClosed ?? null
      },
      count: snapshots.length,
      snapshots
    })
  } catch (error) {
    const statusCode = error instanceof CostIntelligenceValidationError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'Unable to list operational P&L snapshots.'

    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
