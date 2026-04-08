import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { deactivateMember, toTeamAdminErrorResponse } from '@/lib/team-admin/mutate-team'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ memberId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { memberId } = await context.params
    const session = await getServerAuthSession()

    const updated = await deactivateMember({
      memberId,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email || null
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toTeamAdminErrorResponse(error, 'Unable to deactivate team member.')
  }
}
