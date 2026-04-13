import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { recordFactoringOperation } from '@/lib/finance/factoring'
import { FinanceValidationError, toNumber, normalizeString, assertDateString } from '@/lib/finance/shared'
import { roundCurrency } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

/**
 * POST /api/finance/income/[id]/factor
 *
 * Registra una operación de cesión de facturas (factoring) de forma atómica:
 * 1. INSERT greenhouse_finance.factoring_operations
 * 2. INSERT greenhouse_finance.income_payments (payment_source = 'factoring_proceeds')
 * 3. INSERT greenhouse_finance.expenses × 2 (factoring_fee + factoring_advisory)
 * 4. UPDATE greenhouse_finance.income (payment_status = 'paid', collection_method = 'factored')
 *
 * SEMÁNTICA INTENCIONAL:
 * - income.amount_paid = nominalAmount (total de la factura — la deuda del cliente queda saldada)
 * - income_payment.amount = advanceAmount (efectivo real recibido — conciliable contra el banco)
 * - La diferencia (fee) es costo financiero de Efeonce, no deuda del cliente.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: incomeId } = await params

    if (!incomeId) {
      return NextResponse.json({ error: 'Income ID is required.' }, { status: 400 })
    }

    const body = await request.json()

    // ── Validate required fields ──────────────────────────────────────────

    const factoringProviderId = normalizeString(body.factoringProviderId)

    if (!factoringProviderId) {
      return NextResponse.json(
        { error: 'factoringProviderId es requerido.' },
        { status: 400 }
      )
    }

    const nominalAmount = roundCurrency(toNumber(body.nominalAmount))
    const advanceAmount = roundCurrency(toNumber(body.advanceAmount))
    const interestAmount = roundCurrency(toNumber(body.interestAmount ?? 0))
    const advisoryFeeAmount = roundCurrency(toNumber(body.advisoryFeeAmount ?? 0))
    const feeRate = toNumber(body.feeRate ?? 0)

    if (nominalAmount <= 0) {
      return NextResponse.json({ error: 'nominalAmount debe ser mayor a 0.' }, { status: 400 })
    }

    if (advanceAmount <= 0) {
      return NextResponse.json({ error: 'advanceAmount debe ser mayor a 0.' }, { status: 400 })
    }

    if (advanceAmount >= nominalAmount) {
      return NextResponse.json(
        { error: 'advanceAmount debe ser menor al nominal de la factura.' },
        { status: 400 }
      )
    }

    const feeTotal = roundCurrency(interestAmount + advisoryFeeAmount)
    const expectedFee = roundCurrency(nominalAmount - advanceAmount)

    if (Math.abs(feeTotal - expectedFee) > 1) {
      return NextResponse.json(
        {
          error: `La suma de interés (${interestAmount}) + asesoría (${advisoryFeeAmount}) debe ser igual al fee total (${expectedFee}).`,
          expected: expectedFee,
          received: feeTotal
        },
        { status: 400 }
      )
    }

    const operationDate = assertDateString(body.operationDate, 'operationDate')

    const todayInSantiago = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

    if (operationDate > todayInSantiago) {
      return NextResponse.json(
        { error: `La fecha de operación no puede ser futura. Hoy es ${todayInSantiago}.` },
        { status: 400 }
      )
    }

    const paymentAccountId = normalizeString(body.paymentAccountId)

    if (!paymentAccountId) {
      return NextResponse.json(
        { error: 'paymentAccountId es requerido para registrar el depósito del advance.' },
        { status: 400 }
      )
    }

    const settlementDate = body.settlementDate
      ? assertDateString(body.settlementDate, 'settlementDate')
      : null

    const externalReference = body.externalReference
      ? normalizeString(body.externalReference)
      : null

    const externalFolio = body.externalFolio
      ? normalizeString(body.externalFolio)
      : null

    // ── Execute atomic factoring operation ───────────────────────────────

    const result = await recordFactoringOperation({
      incomeId,
      factoringProviderId,
      nominalAmount,
      advanceAmount,
      interestAmount,
      advisoryFeeAmount,
      feeRate,
      operationDate,
      settlementDate,
      externalReference,
      externalFolio,
      paymentAccountId,
      actorUserId: tenant.userId || null
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const message = error instanceof Error ? error.message : String(error)

    console.error('[income/factor] Unexpected error:', error)

    return NextResponse.json({ error: `Error interno: ${message}` }, { status: 500 })
  }
}
