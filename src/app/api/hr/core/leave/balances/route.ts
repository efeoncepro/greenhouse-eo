import { NextResponse } from 'next/server'

import { listLeaveBalances } from '@/lib/hr-core/service'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const year = searchParams.get('year')

    const payload = await listLeaveBalances({
      tenant,
      memberId,
      year: year ? Number(year) : null
    })

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load leave balances.')
  }
}
