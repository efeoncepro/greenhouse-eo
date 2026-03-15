import { NextResponse } from 'next/server'

import { getUserRoleState, updateUserRoles } from '@/lib/admin/role-management'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const normalizeCodeList = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const state = await getUserRoleState(id)

  return NextResponse.json(state)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const roleCodes = normalizeCodeList(body.roleCodes)

  const updatedAssignments = await updateUserRoles({
    userId: id,
    roleCodes,
    assignedByUserId: tenant.userId
  })

  return NextResponse.json({ userId: id, currentAssignments: updatedAssignments })
}
