import { NextResponse } from 'next/server'

import { materializeAllAvailableVatPeriods, materializeVatLedgerForPeriod } from '@/lib/finance/vat-ledger'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const year = body.year as number | undefined
    const month = body.month as number | undefined
    const startMs = Date.now()

    if (year && month) {
      const summary = await materializeVatLedgerForPeriod(year, month, 'admin-trigger')

      return NextResponse.json({
        periods: 1,
        summaries: [summary],
        durationMs: Date.now() - startMs
      })
    }

    const result = await materializeAllAvailableVatPeriods('admin-trigger-all')

    return NextResponse.json({
      ...result,
      durationMs: Date.now() - startMs
    })
  } catch (error) {
    console.error('[vat-ledger-materialize] Admin trigger failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
