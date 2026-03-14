import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { deleteAssignment, toTeamAdminErrorResponse, updateAssignment } from '@/lib/team-admin/mutate-team'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import type { UpdateAssignmentInput } from '@/types/team'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ assignmentId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { assignmentId } = await context.params
    const body = (await request.json().catch(() => null)) as UpdateAssignmentInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)

    const updated = await updateAssignment({
      assignmentId,
      input: body,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email || null
    })

    return NextResponse.json(updated)
  } catch (error) {
    return toTeamAdminErrorResponse(error, 'Unable to update assignment.')
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ assignmentId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { assignmentId } = await context.params
    const session = await getServerSession(authOptions)

    const deleted = await deleteAssignment({
      assignmentId,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email || null
    })

    return NextResponse.json(deleted)
  } catch (error) {
    return toTeamAdminErrorResponse(error, 'Unable to delete assignment.')
  }
}
