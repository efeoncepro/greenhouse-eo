import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { can } from '@/lib/entitlements/runtime'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getFinanceCurrentPeriod } from '@/lib/finance/reporting'
import { readFinanceAiLlmSummary } from '@/lib/finance/ai/llm-enrichment-reader'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TASK-1201 — lectura de Finance AI insights detrás de la capability gobernada
  // `finance.ai.read_insights` (Full API parity: un primitive canónico, autorización
  // fina reutilizable por UI/Nexa/API).
  if (!can(tenant, 'finance.ai.read_insights', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden')
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
