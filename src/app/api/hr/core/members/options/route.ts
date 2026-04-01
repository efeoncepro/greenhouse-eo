import { NextResponse } from 'next/server'

import { listDepartmentHeadOptions } from '@/lib/hr-core/service'
import { requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import type { HrMemberOptionsResponse } from '@/types/hr-core'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response: HrMemberOptionsResponse = {
      members: await listDepartmentHeadOptions()
    }

    return NextResponse.json(response)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load HR member options.')
  }
}
