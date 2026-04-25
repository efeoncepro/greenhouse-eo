import { NextResponse } from 'next/server'

import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parseDays = (raw: string | null): number => {
  if (!raw) return 7

  const parsed = Number.parseInt(raw, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) return 7

  return Math.min(parsed, 90)
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseDays(searchParams.get('days'))
  const forceRefresh = searchParams.get('refresh') === 'true'

  const overview = await getGcpBillingOverview({ days, forceRefresh })

  return NextResponse.json(overview)
}
