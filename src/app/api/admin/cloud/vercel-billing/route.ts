import { NextResponse } from 'next/server'

import { getVercelBillingOverview } from '@/lib/cloud/vercel-billing'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parseDays = (raw: string | null): number => {
  if (!raw) return 30

  const parsed = Number.parseInt(raw, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) return 30

  return Math.min(parsed, 366)
}

const parseDateParam = (raw: string | null): string | undefined => {
  if (!raw) return undefined

  const parsed = new Date(raw)

  return Number.isNaN(parsed.getTime()) ? undefined : raw
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  const overview = await getVercelBillingOverview({
    days: parseDays(searchParams.get('days')),
    from: parseDateParam(searchParams.get('from')),
    to: parseDateParam(searchParams.get('to')),
    forceRefresh: searchParams.get('refresh') === 'true'
  })

  return NextResponse.json(overview)
}
