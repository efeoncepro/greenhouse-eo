import { NextResponse } from 'next/server'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse
  }

  const entity = await getOperatingEntityIdentity()

  if (!entity) {
    return NextResponse.json({ error: 'Operating entity not configured' }, { status: 404 })
  }

  return NextResponse.json(entity)
}
