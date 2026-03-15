import { NextResponse } from 'next/server'

import { createDepartment, listDepartments } from '@/lib/hr-core/service'
import { requireHrCoreManageTenantContext, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { CreateDepartmentInput } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await listDepartments()

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load departments.')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as CreateDepartmentInput | null

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const created = await createDepartment(body)

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to create department.')
  }
}
