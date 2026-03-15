import { NextResponse } from 'next/server'

import { getHrCoreMetadata } from '@/lib/hr-core/service'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getHrCoreMetadata()

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load HR Core metadata.')
  }
}
