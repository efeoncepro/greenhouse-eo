import { NextResponse } from 'next/server'

import { getGitHubBillingOverview } from '@/lib/cloud/github-billing'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parseIntParam = (raw: string | null): number | undefined => {
  if (!raw) return undefined

  const parsed = Number.parseInt(raw, 10)

  return Number.isFinite(parsed) ? parsed : undefined
}

const parseStringParam = (raw: string | null): string | undefined => {
  const value = raw?.trim()

  return value ? value : undefined
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  const overview = await getGitHubBillingOverview({
    year: parseIntParam(searchParams.get('year')),
    month: parseIntParam(searchParams.get('month')),
    day: parseIntParam(searchParams.get('day')),
    repository: parseStringParam(searchParams.get('repository')),
    product: parseStringParam(searchParams.get('product')),
    sku: parseStringParam(searchParams.get('sku')),
    forceRefresh: searchParams.get('refresh') === 'true'
  })

  return NextResponse.json(overview)
}
