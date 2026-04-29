import { NextResponse } from 'next/server'

import { getCashPositionOverview } from '@/lib/finance/cash-position/overview'
import { FinanceValidationError } from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parsePeriodValue = (value: string | null, fieldName: string) => {
  if (!value) return null

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new FinanceValidationError(`${fieldName} must be a positive integer.`)
  }

  return parsed
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const year = parsePeriodValue(url.searchParams.get('year'), 'year')
    const month = parsePeriodValue(url.searchParams.get('month'), 'month')

    const overview = await getCashPositionOverview({
      year,
      month,
      actorUserId: tenant.userId || null,
      spaceId: tenant.spaceId || null
    })

    return NextResponse.json({
      ...overview,
      receivable: overview.legacy.receivable,
      payable: overview.legacy.payable,
      fxGainLossClp: overview.legacy.fxGainLossClp,
      netPosition: overview.legacy.netPosition
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
