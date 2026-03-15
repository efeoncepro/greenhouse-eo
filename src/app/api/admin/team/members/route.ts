import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { createMember, getAdminTeamMembersPayload, toTeamAdminErrorResponse } from '@/lib/team-admin/mutate-team'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { CreateMemberInput } from '@/types/team'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getAdminTeamMembersPayload()

    return NextResponse.json(payload)
  } catch (error) {
    return toTeamAdminErrorResponse(error, 'Unable to load admin team capabilities.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as CreateMemberInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)

    const created = await createMember({
      input: body,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email || null
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toTeamAdminErrorResponse(error, 'Unable to create team member.')
  }
}
