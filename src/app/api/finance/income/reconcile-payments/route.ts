import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { reconcilePaymentTotals } from '@/lib/finance/payment-ledger'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/finance/income/reconcile-payments
 *
 * Batch reconcile all income records where amount_paid diverges from
 * SUM(income_payments.amount). Fixes drift caused by direct UPDATEs
 * or missing triggers.
 */
export async function POST() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find divergent incomes
  const divergentRows = await runGreenhousePostgresQuery<{
    income_id: string
    current_paid: string
    sum_payments: string
  }>(
    `SELECT
       i.income_id,
       COALESCE(i.amount_paid, 0)::text AS current_paid,
       COALESCE(p.total, 0)::text AS sum_payments
     FROM greenhouse_finance.income i
     LEFT JOIN (
       SELECT income_id, SUM(amount)::numeric AS total
       FROM greenhouse_finance.income_payments
       GROUP BY income_id
     ) p ON p.income_id = i.income_id
     WHERE ABS(COALESCE(i.amount_paid, 0) - COALESCE(p.total, 0)) > 0.01`
  )

  if (divergentRows.length === 0) {
    return NextResponse.json({
      reconciled: 0,
      message: 'Todos los saldos están consistentes.'
    })
  }

  const results: Array<{
    incomeId: string
    previousPaid: number
    correctedPaid: number
  }> = []

  for (const row of divergentRows) {
    try {
      const result = await reconcilePaymentTotals(row.income_id)

      if (result.corrected) {
        results.push({
          incomeId: row.income_id,
          previousPaid: toNumber(row.current_paid),
          correctedPaid: result.amountPaid
        })
      }
    } catch (error) {
      console.error(`[reconcile-payments] Failed for ${row.income_id}:`, error)
    }
  }

  return NextResponse.json({
    divergentFound: divergentRows.length,
    reconciled: results.length,
    corrections: results
  })
}
