import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { assertFinanceBigQueryReadiness } from '@/lib/finance/schema'
import { getFinanceProjectId, runFinanceQuery, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface AgingRow {
  bucket: string
  total: unknown
  count: unknown
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await assertFinanceBigQueryReadiness({ tables: ['fin_income'] })

  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<AgingRow>(`
    SELECT
      CASE
        WHEN due_date >= CURRENT_DATE() THEN 'current'
        WHEN DATE_DIFF(CURRENT_DATE(), due_date, DAY) BETWEEN 1 AND 30 THEN '1_30'
        WHEN DATE_DIFF(CURRENT_DATE(), due_date, DAY) BETWEEN 31 AND 60 THEN '31_60'
        WHEN DATE_DIFF(CURRENT_DATE(), due_date, DAY) BETWEEN 61 AND 90 THEN '61_90'
        ELSE '90_plus'
      END AS bucket,
      SUM(
        COALESCE(total_amount_clp, 0) * SAFE_DIVIDE(
          GREATEST(COALESCE(total_amount, 0) - COALESCE(amount_paid, 0), 0),
          NULLIF(COALESCE(total_amount, 0), 0)
        )
      ) AS total,
      COUNT(*) AS count
    FROM \`${projectId}.greenhouse.fin_income\`
    WHERE payment_status IN ('pending', 'overdue', 'partial')
      AND due_date IS NOT NULL
    GROUP BY 1
  `)

  const buckets: Record<string, { total: number; count: number }> = {
    current: { total: 0, count: 0 },
    '1_30': { total: 0, count: 0 },
    '31_60': { total: 0, count: 0 },
    '61_90': { total: 0, count: 0 },
    '90_plus': { total: 0, count: 0 }
  }

  for (const row of rows) {
    const key = row.bucket

    if (key in buckets) {
      buckets[key] = { total: toNumber(row.total), count: toNumber(row.count) }
    }
  }

  return NextResponse.json({ aging: buckets })
}
