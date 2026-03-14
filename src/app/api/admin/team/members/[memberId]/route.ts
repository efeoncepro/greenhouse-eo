import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { toTeamAdminErrorResponse, updateMember } from '@/lib/team-admin/mutate-team'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { UpdateMemberInput } from '@/types/team'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await context.params
    const body = (await request.json().catch(() => null)) as UpdateMemberInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)

    const updated = await updateMember({
      memberId,
      input: body,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email || null
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toTeamAdminErrorResponse(error, 'Unable to update team member.')
  }
}
