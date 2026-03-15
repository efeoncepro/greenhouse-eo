import { NextResponse } from 'next/server'

import { getPeopleMeta } from '@/lib/people/get-people-meta'
import { toPeopleErrorResponse } from '@/lib/people/shared'
import { requirePeopleTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { tenant, errorResponse } = await requirePeopleTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json(getPeopleMeta(tenant.roleCodes))
  } catch (error) {
    return toPeopleErrorResponse(error, 'Unable to load people metadata.')
  }
}
