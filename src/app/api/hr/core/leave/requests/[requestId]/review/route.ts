import { NextResponse } from 'next/server'

import { reviewLeaveRequest } from '@/lib/hr-core/service'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { ReviewLeaveRequestInput } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { requestId } = await context.params
    const body = (await request.json().catch(() => null)) as ReviewLeaveRequestInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await reviewLeaveRequest({
      tenant,
      requestId,
      input: body,
      actorUserId: tenant.userId
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to review leave request.')
  }
}
