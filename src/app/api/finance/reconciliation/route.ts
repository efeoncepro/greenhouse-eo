import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import {
  listReconciliationPeriodsFromPostgres,
  createReconciliationPeriodInPostgres
} from '@/lib/finance/postgres-reconciliation'
import {
  assertNonEmptyString,
  normalizeString,
  toNumber,
  FinanceValidationError
} from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const status = searchParams.get('status')

  const result = await listReconciliationPeriodsFromPostgres({ accountId, status })

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const accountId = assertNonEmptyString(body.accountId, 'accountId')
    const year = toNumber(body.year)
    const month = toNumber(body.month)

    if (year < 2020 || year > 2100) {
      throw new FinanceValidationError('year must be between 2020 and 2100.')
    }

    if (month < 1 || month > 12) {
      throw new FinanceValidationError('month must be between 1 and 12.')
    }

    const openingBalance = toNumber(body.openingBalance)
    const periodId = `${accountId}_${year}_${String(month).padStart(2, '0')}`
    const notes = body.notes ? normalizeString(body.notes) : null

    const result = await createReconciliationPeriodInPostgres({
      periodId, accountId, year, month, openingBalance, notes
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const detail = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: `Finance reconciliation write failed. BigQuery fallback is disabled: ${detail}`,
        code: 'FINANCE_BQ_WRITE_DISABLED'
      },
      { status: 503 }
    )
  }
}
