import { NextResponse } from 'next/server'

import { updateKeyResult, deleteKeyResult } from '@/lib/hr-goals/postgres-goals-store'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ goalId: string; krId: string }> }
) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { goalId, krId } = await params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await updateKeyResult(goalId, krId, body)

    return NextResponse.json(updated)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update key result.')
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ goalId: string; krId: string }> }
) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { goalId, krId } = await params

    await deleteKeyResult(goalId, krId)

    return NextResponse.json({ deleted: true, krId })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to delete key result.')
  }
}
