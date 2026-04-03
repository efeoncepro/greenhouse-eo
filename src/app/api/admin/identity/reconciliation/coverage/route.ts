import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { auditDeliveryIdentityCoverage } from '@/lib/identity/reconciliation/delivery-coverage'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const spaceId = url.searchParams.get('spaceId') || tenant.spaceId || null
  const yearParam = url.searchParams.get('year')
  const monthParam = url.searchParams.get('month')

  if (!spaceId) {
    return NextResponse.json(
      { error: 'spaceId is required (query param or tenant context)' },
      { status: 400 }
    )
  }

  if (!yearParam || !monthParam) {
    return NextResponse.json(
      { error: 'year and month are required and are interpreted as a due_date month window' },
      { status: 400 }
    )
  }

  const year = Number(yearParam)
  const month = Number(monthParam)

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return NextResponse.json(
      { error: 'year and month must be integers' },
      { status: 400 }
    )
  }

  try {
    const coverage = await auditDeliveryIdentityCoverage({
      spaceId,
      year,
      month
    })

    return NextResponse.json({ coverage })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
