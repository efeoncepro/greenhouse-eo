import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { FinanceValidationError, toNumber } from '@/lib/finance/shared'
import {
  assertFinanceSlice2PostgresReady,
  isFinanceSlice2PostgresEnabled
} from '@/lib/finance/postgres-store-slice2'
import {
  computeClientEconomicsSnapshots,
  getClientEconomics,
  listClientEconomicsByPeriod
} from '@/lib/finance/postgres-store-intelligence'

export const dynamic = 'force-dynamic'

const sanitizeSnapshotForPresentation = <T extends {
  totalRevenueClp: number
  directCostsClp: number
  indirectCostsClp: number
  grossMarginPercent: number | null
  netMarginPercent: number | null
  notes?: string | null
}>(snapshot: T) => {
  const totalCosts = snapshot.directCostsClp + snapshot.indirectCostsClp
  const isBackfill = (snapshot.notes || '').toLowerCase().includes('backfill')
  const lacksCostCoverage = snapshot.totalRevenueClp > 0 && totalCosts <= 0
  const suspiciousPlaceholderCosts = snapshot.totalRevenueClp > 0 && totalCosts > 0 && totalCosts < 5000
  const hasCompleteCostCoverage = !(lacksCostCoverage || (isBackfill && suspiciousPlaceholderCosts))

  return {
    ...snapshot,
    hasCompleteCostCoverage,
    grossMarginPercent: hasCompleteCostCoverage ? snapshot.grossMarginPercent : null,
    netMarginPercent: hasCompleteCostCoverage ? snapshot.netMarginPercent : null
  }
}

export { sanitizeSnapshotForPresentation }

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const year = Number(searchParams.get('year')) || new Date().getFullYear()
  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1

  if (clientId) {
    const snapshot = await getClientEconomics(clientId, year, month)

    return NextResponse.json({ snapshot: snapshot ? sanitizeSnapshotForPresentation(snapshot) : null })
  }

  const snapshots = await listClientEconomicsByPeriod(year, month)

  return NextResponse.json({ snapshots: snapshots.map(sanitizeSnapshotForPresentation), year, month })
}

// POST /api/finance/intelligence/client-economics?action=compute
// Computes and upserts client economics for a given period from income + cost allocations
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isFinanceSlice2PostgresEnabled()) {
    return NextResponse.json({ error: 'Finance Postgres not configured' }, { status: 503 })
  }

  await assertFinanceSlice2PostgresReady()

  try {
    const body = await request.json()
    const year = toNumber(body.year) || new Date().getFullYear()
    const month = toNumber(body.month) || new Date().getMonth() + 1

    if (month < 1 || month > 12) {
      throw new FinanceValidationError('month must be between 1 and 12')
    }

    const results = await computeClientEconomicsSnapshots(year, month)

    return NextResponse.json({
      computed: true,
      year,
      month,
      clientCount: results.length,
      snapshots: results
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
