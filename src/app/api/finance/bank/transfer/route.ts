import { NextResponse } from 'next/server'

import { recordInternalTransfer } from '@/lib/finance/internal-transfers'
import {
  FinanceValidationError,
  assertDateString,
  assertNonEmptyString,
  normalizeString,
  toNumber
} from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const transfer = await recordInternalTransfer({
      fromAccountId: assertNonEmptyString(body.fromAccountId, 'fromAccountId'),
      toAccountId: assertNonEmptyString(body.toAccountId, 'toAccountId'),
      amount: toNumber(body.amount),
      currency: body.currency ? normalizeString(body.currency) : null,
      transferDate: assertDateString(body.transferDate, 'transferDate'),
      reference: body.reference ? normalizeString(body.reference) : null,
      notes: body.notes ? normalizeString(body.notes) : null,
      exchangeRateOverride: body.exchangeRateOverride != null ? toNumber(body.exchangeRateOverride) : null,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json(transfer, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
