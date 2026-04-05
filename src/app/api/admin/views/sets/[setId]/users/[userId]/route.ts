import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { removeUserFromSet, PermissionSetError } from '@/lib/admin/permission-sets'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ setId: string; userId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { setId, userId } = await params

  try {
    await removeUserFromSet(setId, userId, tenant.userId)

    return NextResponse.json({ setId, userId, removed: true })
  } catch (error) {
    if (error instanceof PermissionSetError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error(`[admin/views/sets/${setId}/users/${userId}] DELETE error:`, error)

    return NextResponse.json({ error: 'No se pudo revocar al usuario del Permission Set.' }, { status: 500 })
  }
}
