import { NextResponse } from 'next/server'

import { getUserEntitlementsAccess } from '@/lib/admin/entitlements-governance'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await params

  try {
    const data = await getUserEntitlementsAccess({
      userId,
      spaceId: tenant.spaceId
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error(`[admin/entitlements/users/${userId}] GET error:`, error)

    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el acceso efectivo.' }, { status: 500 })
  }
}

