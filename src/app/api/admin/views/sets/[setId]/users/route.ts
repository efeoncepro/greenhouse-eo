import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { getSetUsers, listAssignableUsers, assignUsersToSet, PermissionSetError } from '@/lib/admin/permission-sets'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { setId } = await params

  try {
    const url = new URL(request.url)
    const scope = url.searchParams.get('scope')

    if (scope === 'assignable') {
      const users = await listAssignableUsers()

      return NextResponse.json({ users })
    }

    const users = await getSetUsers(setId)

    return NextResponse.json({ users })
  } catch (error) {
    console.error(`[admin/views/sets/${setId}/users] GET error:`, error)

    return NextResponse.json({ error: 'No se pudo obtener los usuarios del Permission Set.' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { setId } = await params

  try {
    const body = await request.json()

    const userIds = Array.isArray(body.userIds) ? body.userIds.filter((id: unknown) => typeof id === 'string' && id.trim()) : []

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un usuario.' }, { status: 400 })
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : undefined
    const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : null

    const assignedCount = await assignUsersToSet(setId, userIds, {
      assignedBy: tenant.userId,
      reason,
      expiresAt
    })

    return NextResponse.json({ setId, assignedCount }, { status: 201 })
  } catch (error) {
    if (error instanceof PermissionSetError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error(`[admin/views/sets/${setId}/users] POST error:`, error)

    return NextResponse.json({ error: 'No se pudo asignar los usuarios al Permission Set.' }, { status: 500 })
  }
}
