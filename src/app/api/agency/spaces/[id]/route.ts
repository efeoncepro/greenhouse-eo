import { NextResponse } from 'next/server'

import { getAgencySpace360 } from '@/lib/agency/space-360'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAgencyTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const detail = await getAgencySpace360(id)

  if (!detail) {
    return NextResponse.json({ error: 'Space not found' }, { status: 404 })
  }

  return NextResponse.json(detail)
}
