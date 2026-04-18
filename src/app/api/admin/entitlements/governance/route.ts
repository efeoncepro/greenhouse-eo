import { NextResponse } from 'next/server'

import { getEntitlementsGovernanceOverview } from '@/lib/admin/entitlements-governance'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await getEntitlementsGovernanceOverview(tenant.spaceId)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[admin/entitlements/governance] GET error:', error)

    return NextResponse.json({ error: 'No se pudo cargar la gobernanza de entitlements.' }, { status: 500 })
  }
}

