import { NextResponse } from 'next/server'

import { resolveCapabilityModules } from '@/lib/capabilities/resolve-capabilities'
import { requireClientTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireClientTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const modules = resolveCapabilityModules({
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  })

  return NextResponse.json({
    clientId: tenant.clientId,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules,
    modules
  })
}
