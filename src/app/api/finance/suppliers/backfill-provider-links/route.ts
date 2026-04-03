import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { backfillFinanceSupplierProviderLinksInPostgres } from '@/lib/finance/postgres-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { limit?: number } | null
  const limit = typeof body?.limit === 'number' && Number.isFinite(body.limit) ? Math.max(1, Math.min(1000, body.limit)) : 250

  const result = await backfillFinanceSupplierProviderLinksInPostgres({ limit })

  return NextResponse.json(result)
}
