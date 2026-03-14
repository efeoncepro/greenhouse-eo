import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { ensureFinanceInfrastructure } from '@/lib/finance/schema'
import { getFinanceProjectId, runFinanceQuery, toNumber } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface ServiceLineRow {
  service_line: string
  income: unknown
  expenses: unknown
}

export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureFinanceInfrastructure()

  const projectId = getFinanceProjectId()

  const rows = await runFinanceQuery<ServiceLineRow>(`
    WITH service_income AS (
      SELECT COALESCE(service_line, 'unassigned') AS service_line, SUM(total_amount_clp) AS total
      FROM \`${projectId}.greenhouse.fin_income\`
      WHERE payment_status IN ('paid', 'partial')
      GROUP BY 1
    ),
    service_expenses AS (
      SELECT COALESCE(service_line, 'unassigned') AS service_line, SUM(total_amount_clp) AS total
      FROM \`${projectId}.greenhouse.fin_expenses\`
      WHERE payment_status = 'paid'
      GROUP BY 1
    )
    SELECT
      COALESCE(i.service_line, e.service_line) AS service_line,
      COALESCE(i.total, 0) AS income,
      COALESCE(e.total, 0) AS expenses
    FROM service_income i
    FULL OUTER JOIN service_expenses e ON e.service_line = i.service_line
    ORDER BY income DESC
  `)

  return NextResponse.json({
    serviceLines: rows.map(r => ({
      serviceLine: r.service_line,
      income: toNumber(r.income),
      expenses: toNumber(r.expenses),
      net: toNumber(r.income) - toNumber(r.expenses)
    }))
  })
}
