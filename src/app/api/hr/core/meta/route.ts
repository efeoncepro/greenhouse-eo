import { NextResponse } from 'next/server'

import { getHrCoreMetadata, resolveCurrentHrMemberId } from '@/lib/hr-core/service'
import { isHrAdminTenant, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getHrCoreMetadata()
    const currentMemberId = await resolveCurrentHrMemberId(tenant).catch(() => tenant.memberId ?? null)

    return NextResponse.json({
      ...payload,
      currentMemberId,
      hasHrAdminAccess: isHrAdminTenant(tenant)
    })
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load HR Core metadata.')
  }
}
