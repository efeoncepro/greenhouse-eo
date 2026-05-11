import { NextResponse } from 'next/server'

import { getEntitlementsGovernanceOverview } from '@/lib/admin/entitlements-governance'
import { can } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'access.governance.role_defaults.read', 'read', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = await getEntitlementsGovernanceOverview(tenant.spaceId)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[admin/entitlements/governance] GET error:', error)

    return NextResponse.json({ error: 'No se pudo cargar la gobernanza de entitlements.' }, { status: 500 })
  }
}
