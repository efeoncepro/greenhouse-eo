import { NextResponse } from 'next/server'

import { createLeaveRequest, listLeaveRequests } from '@/lib/hr-core/service'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { CreateLeaveRequestInput } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const status = searchParams.get('status')
    const year = searchParams.get('year')

    const payload = await listLeaveRequests({
      tenant,
      memberId,
      status,
      year: year ? Number(year) : null
    })

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load leave requests.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as CreateLeaveRequestInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const created = await createLeaveRequest({
      tenant,
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create leave request.')
  }
}
