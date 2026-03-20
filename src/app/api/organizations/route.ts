import { NextResponse } from 'next/server'

import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { getOrganizationList } from '@/lib/account-360/organization-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()
  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || '50') || 50))
  const search = searchParams.get('search') || undefined
  const status = searchParams.get('status') || undefined
  const type = searchParams.get('type') || undefined

  const result = await getOrganizationList({ page, pageSize, search, status, type })

  return NextResponse.json(result)
}
