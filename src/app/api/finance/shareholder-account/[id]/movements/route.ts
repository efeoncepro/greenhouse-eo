import { NextResponse } from 'next/server'

import {
  listShareholderAccountMovements,
  listShareholderAccounts,
  recordShareholderAccountMovement,
  type ShareholderAccountMovement,
  type ShareholderMovementDirection,
  type ShareholderMovementType
} from '@/lib/finance/shareholder-account/store'
import {
  FinanceValidationError,
  assertNonEmptyString,
  assertValidCurrency,
  normalizeString,
  toNumber,
  type FinanceCurrency
} from '@/lib/finance/shared'
import { requireShareholderAccountTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const serializeMovement = (movement: ShareholderAccountMovement) => ({
  movementId: movement.movementId,
  accountId: movement.accountId,
  direction: movement.direction,
  movementType: movement.movementType,
  amount: movement.amount,
  currency: movement.currency,
  exchangeRate: movement.exchangeRate,
  amountClp: movement.amountClp,
  linkedExpenseId: movement.linkedExpenseId,
  linkedIncomeId: movement.linkedIncomeId,
  linkedPaymentType: movement.linkedPaymentType,
  linkedPaymentId: movement.linkedPaymentId,
  settlementGroupId: movement.settlementGroupId,
  counterpartyAccountId: movement.counterpartyAccountId,
  counterpartyAccountName: movement.counterpartyAccountName,
  description: movement.description,
  evidenceUrl: movement.evidenceUrl,
  movementDate: movement.movementDate,
  runningBalanceClp: movement.runningBalanceClp,
  recordedByUserId: movement.recordedByUserId,
  recordedAt: movement.recordedAt
})

const assertAccountVisible = async (accountId: string, spaceId?: string) => {
  const visibleAccounts = await listShareholderAccounts({
    spaceId: spaceId || null
  })

  if (!visibleAccounts.some(item => item.accountId === accountId)) {
    throw new FinanceValidationError(`Shareholder account "${accountId}" not found.`, 404)
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireShareholderAccountTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const accountId = assertNonEmptyString(id, 'accountId')

    await assertAccountVisible(accountId, tenant.spaceId)

    const url = new URL(request.url)
    const fromDate = url.searchParams.get('fromDate')
    const toDate = url.searchParams.get('toDate')
    const direction = url.searchParams.get('direction')
    const movementType = url.searchParams.get('movementType')

    const items = await listShareholderAccountMovements({
      accountId,
      startDate: fromDate,
      endDate: toDate,
      direction: direction ? (normalizeString(direction) as ShareholderMovementDirection) : null,
      movementType: movementType ? (normalizeString(movementType) as ShareholderMovementType) : null
    })

    return NextResponse.json({
      items: items.map(serializeMovement),
      total: items.length
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireShareholderAccountTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const accountId = assertNonEmptyString(id, 'accountId')

    await assertAccountVisible(accountId, tenant.spaceId)

    const body = await request.json()

    const movement = await recordShareholderAccountMovement(accountId, {
      direction: normalizeString(body.direction) as ShareholderMovementDirection,
      movementType: normalizeString(body.movementType) as ShareholderMovementType,
      amount: toNumber(body.amount),
      currency: body.currency ? (assertValidCurrency(body.currency) as FinanceCurrency) : null,
      movementDate: assertNonEmptyString(body.movementDate, 'movementDate'),
      description: body.description ? normalizeString(body.description) : null,
      evidenceUrl: body.evidenceUrl ? normalizeString(body.evidenceUrl) : null,
      linkedExpenseId: body.linkedExpenseId ? normalizeString(body.linkedExpenseId) : null,
      linkedIncomeId: body.linkedIncomeId ? normalizeString(body.linkedIncomeId) : null,
      linkedPaymentType: body.linkedPaymentType
        ? normalizeString(body.linkedPaymentType) as 'income_payment' | 'expense_payment'
        : null,
      linkedPaymentId: body.linkedPaymentId ? normalizeString(body.linkedPaymentId) : null,
      counterpartyAccountId: body.counterpartyAccountId ? normalizeString(body.counterpartyAccountId) : null,
      exchangeRateOverride: body.exchangeRateOverride != null ? toNumber(body.exchangeRateOverride) : null,
      spaceId: tenant.spaceId || null,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json(serializeMovement(movement), { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
