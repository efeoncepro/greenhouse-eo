import { NextResponse } from 'next/server'

import { getSupervisorWorkspace } from '@/lib/hr-core/supervisor-workspace'
import { requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { hasBroadHrLeaveAccess, resolveHrLeaveAccessContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const hasBroadAccess = hasBroadHrLeaveAccess(tenant)
    const accessContext = hasBroadAccess ? null : await resolveHrLeaveAccessContext(tenant)

    if (!hasBroadAccess && !accessContext) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await getSupervisorWorkspace({
      tenant,
      hasBroadAccess
    })

    return NextResponse.json(payload)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'Unable to load supervisor workspace.')
  }
}
