import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import {
  getUserRoleState,
  updateUserRoles,
  RoleGuardrailError
} from '@/lib/admin/role-management'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/team/roles/:userId
 * Returns current role assignments + available roles catalog for a user.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse

  const { userId } = await params
  const state = await getUserRoleState(userId)

  return NextResponse.json(state)
}

/**
 * PUT /api/admin/team/roles/:userId
 * Replace all roles for a user. Expects { roleCodes: string[] }.
 * Handles guardrails: superadmin protection, collaborator auto-add, audit events.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse

  const { userId } = await params

  try {
    const body = await request.json()
    const roleCodes = body.roleCodes

    if (!Array.isArray(roleCodes) || roleCodes.some((c: unknown) => typeof c !== 'string')) {
      return NextResponse.json(
        { error: 'roleCodes debe ser un array de strings' },
        { status: 400 }
      )
    }

    if (roleCodes.length === 0) {
      return NextResponse.json(
        { error: 'Debe asignar al menos un rol' },
        { status: 400 }
      )
    }

    const updatedAssignments = await updateUserRoles({
      userId,
      roleCodes,
      assignedByUserId: tenant.userId
    })

    return NextResponse.json({
      userId,
      assignments: updatedAssignments,
      updated: true
    })
  } catch (error) {
    if (error instanceof RoleGuardrailError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    throw error
  }
}
