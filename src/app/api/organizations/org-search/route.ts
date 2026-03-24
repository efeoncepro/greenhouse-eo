import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { searchOrganizations } from '@/lib/account-360/organization-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()

  if (q.length < 2) {
    return NextResponse.json({ items: [] })
  }

  const items = await searchOrganizations(q)

  return NextResponse.json({ items })
}
