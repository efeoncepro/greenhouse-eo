import { NextResponse } from 'next/server'

import { listReconciliationCandidates } from '@/lib/finance/reconciliation'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { FinanceValidationError, normalizeString, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  try {
    const { id: periodId } = await params
    const { searchParams } = new URL(request.url)
    const typeParam = normalizeString(searchParams.get('type'))
    const search = searchParams.get('search') || ''
    const limit = toNumber(searchParams.get('limit') || '100')
    const windowDays = toNumber(searchParams.get('windowDays') || '45')

    const payload = await listReconciliationCandidates({
      periodId,
      type: typeParam === 'income' || typeParam === 'expense' ? typeParam : 'all',
      search,
      limit,
      windowDays
    })

    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
