import { NextResponse } from 'next/server'

import { getCapabilityModuleData } from '@/lib/capabilities/get-capability-module-data'
import { getCapabilityModuleAccessState } from '@/lib/capabilities/verify-module-access'
import { requireClientTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleId } = await params
  const accessState = getCapabilityModuleAccessState(moduleId, tenant)

  if (!accessState.moduleExists) {
    return NextResponse.json({ error: 'Capability module not found' }, { status: 404 })
  }

  if (!accessState.hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await getCapabilityModuleData({
    moduleId,
    tenant
  })

  if (!data) {
    return NextResponse.json({ error: 'Capability module not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
