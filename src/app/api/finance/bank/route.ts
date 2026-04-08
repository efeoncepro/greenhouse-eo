import { NextResponse } from 'next/server'

import {
  assignAccountToPayments,
  getBankOverview,
  type TreasuryPaymentAssignment
} from '@/lib/finance/account-balances'
import {
  FinanceValidationError,
  assertNonEmptyString,
  normalizeString,
  toNumber
} from '@/lib/finance/shared'
import { requireBankTreasuryTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const parsePeriodValue = (value: string | null, fieldName: string) => {
  if (!value) return null

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new FinanceValidationError(`${fieldName} must be a positive integer.`)
  }

  return parsed
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireBankTreasuryTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const year = parsePeriodValue(url.searchParams.get('year'), 'year')
    const month = parsePeriodValue(url.searchParams.get('month'), 'month')

    const overview = await getBankOverview({
      year,
      month,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json(overview)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireBankTreasuryTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const accountId = assertNonEmptyString(body.accountId, 'accountId')
    const assignmentsRaw = Array.isArray(body.assignments) ? body.assignments : []

    if (assignmentsRaw.length === 0) {
      throw new FinanceValidationError('assignments must include at least one payment.')
    }

    const assignments: TreasuryPaymentAssignment[] = assignmentsRaw.map((item: Record<string, unknown>) => {
      const paymentType = normalizeString(item?.paymentType)

      if (paymentType !== 'income' && paymentType !== 'expense') {
        throw new FinanceValidationError('Each assignment.paymentType must be "income" or "expense".')
      }

      return {
        paymentType,
        paymentId: assertNonEmptyString(item?.paymentId, 'assignment.paymentId')
      }
    })

    const result = await assignAccountToPayments({
      accountId,
      assignments,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json({
      ...result,
      assignedCount: toNumber(result.assignedCount)
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
