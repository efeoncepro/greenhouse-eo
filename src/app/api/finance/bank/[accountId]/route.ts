import { NextResponse } from 'next/server'

import {
  closeAccountBalancePeriod,
  getBankAccountDetail
} from '@/lib/finance/account-balances'
import { FinanceValidationError } from '@/lib/finance/shared'
import { requireBankTreasuryTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parsePositiveInteger = (value: unknown, fieldName: string) => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new FinanceValidationError(`${fieldName} must be a positive integer.`)
  }

  return parsed
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { tenant, errorResponse } = await requireBankTreasuryTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { accountId } = await params
    const url = new URL(request.url)
    const yearParam = url.searchParams.get('year')
    const monthParam = url.searchParams.get('month')
    const year = yearParam ? parsePositiveInteger(yearParam, 'year') : null
    const month = monthParam ? parsePositiveInteger(monthParam, 'month') : null

    // TASK-705 — pure read path:
    // - materialize: 'skip' (NO recomputar inline; lanes reactivas mantienen snapshots).
    // - historySource: 'monthly_read_model' (lee account_balances_monthly precomputed).
    // El response incluye freshness.isStale=true cuando el snapshot es viejo;
    // la UI muestra banner "Actualizado hace X" sin disparar recompute síncrono.
    const detail = await getBankAccountDetail({
      accountId,
      year,
      month,
      actorUserId: tenant.userId || null,
      materialize: 'skip',
      historySource: 'monthly_read_model'
    })

    return NextResponse.json(detail)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { tenant, errorResponse } = await requireBankTreasuryTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { accountId } = await params
    const body = await request.json()

    if (body?.action !== 'close-period') {
      throw new FinanceValidationError('Unsupported action for treasury account detail route.', 400)
    }

    const year = parsePositiveInteger(body.year, 'year')
    const month = parsePositiveInteger(body.month, 'month')

    const balance = await closeAccountBalancePeriod({
      accountId,
      year,
      month,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json({
      accountId,
      closed: true,
      balance
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
