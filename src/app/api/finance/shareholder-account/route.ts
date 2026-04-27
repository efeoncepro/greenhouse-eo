import { NextResponse } from 'next/server'

import {
  createShareholderAccount,
  listShareholderAccounts,
  type ShareholderAccountStatus,
  type ShareholderAccountSummary
} from '@/lib/finance/shareholder-account/store'
import {
  FinanceValidationError,
  assertValidCurrency,
  normalizeString,
  toNumber,
  type FinanceCurrency
} from '@/lib/finance/shared'
import { requireShareholderAccountTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const serializeAccount = (account: ShareholderAccountSummary) => ({
  accountId: account.accountId,
  accountName: account.accountName,
  accountNumber: account.accountNumber,
  shareholderName: account.shareholderName,
  shareholderEmail: account.shareholderEmail,
  profileId: account.profileId,
  memberId: account.memberId,
  ownershipPercentage: account.ownershipPercentage,
  status: account.status,
  openingBalance: account.openingBalance,
  currentBalance: account.currentBalance,
  currentBalanceClp: account.currentBalanceClp,
  balanceClp: account.currentBalanceClp,
  currency: account.currency,
  movementCount: account.movementCount,
  lastMovementDate: account.lastMovementDate,
  lastMovementAt: account.lastMovementDate,
  notes: account.notes,
  spaceId: account.spaceId,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt
})

export async function GET() {
  const { tenant, errorResponse } = await requireShareholderAccountTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const accounts = await listShareholderAccounts({
      spaceId: tenant.spaceId || null
    })

    const items = accounts.map(serializeAccount)

    const summary = {
      total: items.length,
      activeCount: items.filter(item => item.status === 'active').length,
      frozenCount: items.filter(item => item.status === 'frozen').length,
      closedCount: items.filter(item => item.status === 'closed').length,
      netBalanceClp: items.reduce((total, item) => total + toNumber(item.balanceClp), 0)
    }

    return NextResponse.json({
      items,
      total: items.length,
      summary
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireShareholderAccountTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const created = await createShareholderAccount({
      profileId: normalizeString(body.profileId),
      memberId: body.memberId ? normalizeString(body.memberId) : null,
      accountName: body.accountName ? normalizeString(body.accountName) : null,
      currency: assertValidCurrency(body.currency) as FinanceCurrency,
      status: body.status ? (normalizeString(body.status) as ShareholderAccountStatus) : null,
      ownershipPercentage: body.ownershipPercentage != null ? toNumber(body.ownershipPercentage) : null,
      openingBalance: body.openingBalance != null ? toNumber(body.openingBalance) : null,
      notes: body.notes ? normalizeString(body.notes) : null,
      spaceId: tenant.spaceId || null,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json(serializeAccount(created), { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
