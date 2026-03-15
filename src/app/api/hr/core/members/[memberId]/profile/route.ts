import { NextResponse } from 'next/server'

import { getMemberHrProfile, updateMemberHrProfile } from '@/lib/hr-core/service'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { UpdateHrMemberProfileInput } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await context.params
    const profile = await getMemberHrProfile({ tenant, memberId })

    return NextResponse.json(profile)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load HR member profile.')
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await context.params
    const body = (await request.json().catch(() => null)) as UpdateHrMemberProfileInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    await updateMemberHrProfile({
      memberId,
      input: body,
      actorUserId: tenant.userId
    })

    const profile = await getMemberHrProfile({ tenant, memberId })

    return NextResponse.json(profile)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update HR member profile.')
  }
}
