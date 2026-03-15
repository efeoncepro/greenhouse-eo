import { NextResponse } from 'next/server'

import { getDepartmentById, updateDepartment } from '@/lib/hr-core/service'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { UpdateDepartmentInput } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ departmentId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { departmentId } = await context.params
    const department = await getDepartmentById(departmentId)

    if (!department) {
      return NextResponse.json({ error: 'Department not found.' }, { status: 404 })
    }

    return NextResponse.json(department)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load department detail.')
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ departmentId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { departmentId } = await context.params
    const body = (await request.json().catch(() => null)) as UpdateDepartmentInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const updated = await updateDepartment(departmentId, body)

    return NextResponse.json(updated)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to update department.')
  }
}
