import { NextResponse } from 'next/server'

import { getPartyLifecycleDetail } from '@/lib/commercial/party'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  partyId: string
}

export async function GET(_request: Request, { params }: { params: Promise<RouteParams> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { partyId } = await params
  const detail = await getPartyLifecycleDetail(partyId)

  if (!detail) {
    return NextResponse.json({ error: 'Party not found.' }, { status: 404 })
  }

  return NextResponse.json(detail)
}
