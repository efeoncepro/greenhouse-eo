import { NextResponse } from 'next/server'

import {
  getSettlementDetailForPayment,
  recordSupplementalSettlementLegForPayment
} from '@/lib/finance/settlement-orchestration'
import {
  FinanceValidationError,
  assertDateString,
  assertNonEmptyString,
  assertPositiveAmount,
  normalizeString,
  toNumber
} from '@/lib/finance/shared'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const SUPPLEMENTAL_LEG_TYPES = [
  'internal_transfer',
  'funding',
  'fx_conversion',
  'fee'
] as const

type SupplementalSettlementLegType = typeof SUPPLEMENTAL_LEG_TYPES[number]

const assertPaymentType = (value: string | null) => {
  const normalized = normalizeString(value)

  if (normalized !== 'income' && normalized !== 'expense') {
    throw new FinanceValidationError('paymentType must be "income" or "expense".')
  }

  return normalized
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const paymentType = assertPaymentType(searchParams.get('paymentType'))
    const paymentId = assertNonEmptyString(searchParams.get('paymentId'), 'paymentId')

    const detail = await getSettlementDetailForPayment({ paymentType, paymentId })

    return NextResponse.json(detail)
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const paymentType = assertPaymentType(searchParams.get('paymentType'))
    const paymentId = assertNonEmptyString(searchParams.get('paymentId'), 'paymentId')
    const body = await request.json()
    const legType = assertNonEmptyString(body.legType, 'legType')

    if (!SUPPLEMENTAL_LEG_TYPES.includes(legType as SupplementalSettlementLegType)) {
      throw new FinanceValidationError(`legType must be one of: ${SUPPLEMENTAL_LEG_TYPES.join(', ')}`)
    }

    const amount = assertPositiveAmount(toNumber(body.amount), 'amount')

    const detail = await recordSupplementalSettlementLegForPayment({
      paymentType,
      paymentId,
      legType: legType as SupplementalSettlementLegType,
      direction: body.direction ? normalizeString(body.direction) as 'incoming' | 'outgoing' : null,
      instrumentId: body.instrumentId ? assertNonEmptyString(body.instrumentId, 'instrumentId') : null,
      counterpartyInstrumentId: body.counterpartyInstrumentId
        ? assertNonEmptyString(body.counterpartyInstrumentId, 'counterpartyInstrumentId')
        : null,
      amount,
      currency: body.currency ? normalizeString(body.currency) : null,
      amountClp: body.amountClp != null ? toNumber(body.amountClp) : null,
      exchangeRate: body.exchangeRate != null ? toNumber(body.exchangeRate) : null,
      providerReference: body.providerReference ? normalizeString(body.providerReference) : null,
      providerStatus: body.providerStatus ? normalizeString(body.providerStatus) : null,
      transactionDate: body.transactionDate ? assertDateString(body.transactionDate, 'transactionDate') : null,
      actorUserId: tenant.userId || null,
      notes: body.notes ? normalizeString(body.notes) : null
    })

    return NextResponse.json(detail, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
