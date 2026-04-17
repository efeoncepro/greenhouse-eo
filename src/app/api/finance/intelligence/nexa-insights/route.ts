import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'
import { readFinanceAiLlmSummary } from '@/lib/finance/ai/llm-enrichment-reader'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requestedYear = Number(searchParams.get('year'))
  const requestedMonth = Number(searchParams.get('month'))
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '5'), 1), 10)

  const currentPeriod = getFinanceCurrentPeriod()
  const periodYear = Number.isInteger(requestedYear) && requestedYear > 2000 ? requestedYear : currentPeriod.year

  const periodMonth =
    Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : currentPeriod.month

  try {
    const payload = await readFinanceAiLlmSummary(periodYear, periodMonth, limit)

    return NextResponse.json({
      periodYear,
      periodMonth,
      ...payload
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error('Finance Nexa insights read failed:', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
