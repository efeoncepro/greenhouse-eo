import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { createAssignment, getAdminTeamAssignmentsPayload, toTeamAdminErrorResponse } from '@/lib/team-admin/mutate-team'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { CreateAssignmentInput } from '@/types/team'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const clientId = searchParams.get('clientId')
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const payload = await getAdminTeamAssignmentsPayload({ memberId, clientId, activeOnly })

    return NextResponse.json(payload)
  } catch (error) {
    return toTeamAdminErrorResponse(error, 'Unable to load team assignments.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as CreateAssignmentInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const session = await getServerAuthSession()

    const created = await createAssignment({
      input: body,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email || null
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toTeamAdminErrorResponse(error, 'Unable to create assignment.')
  }
}
