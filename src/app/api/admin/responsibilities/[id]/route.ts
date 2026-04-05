import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import {
  updateResponsibility,
  revokeResponsibility,
  ResponsibilityValidationError
} from '@/lib/operational-responsibility/store'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/responsibilities/[id] — update fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()

    await updateResponsibility(id, {
      isPrimary: body.isPrimary,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo,
      active: body.active
    })

    return NextResponse.json({ responsibilityId: id, updated: true })
  } catch (error) {
    if (error instanceof ResponsibilityValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('Failed to update responsibility:', error)

    return NextResponse.json({ error: 'Error al actualizar responsabilidad.' }, { status: 500 })
  }
}

// DELETE /api/admin/responsibilities/[id] — soft delete (revoke)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params

    await revokeResponsibility(id)

    return NextResponse.json({ responsibilityId: id, revoked: true })
  } catch (error) {
    if (error instanceof ResponsibilityValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('Failed to revoke responsibility:', error)

    return NextResponse.json({ error: 'Error al revocar responsabilidad.' }, { status: 500 })
  }
}
