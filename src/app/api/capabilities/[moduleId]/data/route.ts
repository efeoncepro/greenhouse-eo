import { NextResponse } from 'next/server'

import { getCapabilityModuleData } from '@/lib/capabilities/get-capability-module-data'
import { requireClientTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { moduleId } = await params

  const data = await getCapabilityModuleData({
    moduleId,
    tenant
  })

  if (!data) {
    return NextResponse.json({ error: 'Capability module not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
