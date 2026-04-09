import { NextResponse } from 'next/server'

import {
  getShareholderAccountBalance,
  listShareholderAccounts
} from '@/lib/finance/shareholder-account/store'
import { FinanceValidationError, assertNonEmptyString } from '@/lib/finance/shared'
import { requireShareholderAccountTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireShareholderAccountTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const accountId = assertNonEmptyString(id, 'accountId')

    const visibleAccounts = await listShareholderAccounts({
      spaceId: tenant.spaceId || null
    })

    const account = visibleAccounts.find(item => item.accountId === accountId)

    if (!account) {
      throw new FinanceValidationError(`Shareholder account "${accountId}" not found.`, 404)
    }

    const balance = await getShareholderAccountBalance(accountId)

    return NextResponse.json({
      accountId: balance.accountId,
      currency: balance.currency,
      balance: balance.balance,
      balanceClp: balance.balanceClp,
      position: balance.position,
      movementCount: balance.movementCount,
      lastMovementDate: balance.lastMovementDate,
      lastMovementAt: balance.lastMovementDate,
      status: account.status,
      notes: account.notes
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
