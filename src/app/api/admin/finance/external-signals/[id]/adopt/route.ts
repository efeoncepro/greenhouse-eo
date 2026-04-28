import { NextResponse } from 'next/server'

import { adoptSignalManually } from '@/lib/finance/external-cash-signals'
import {
  assertPaymentInstrumentCapability
} from '@/lib/finance/payment-instruments/access'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { InvalidAccountIdError } from '@/lib/finance/types/account-id'
import { translatePostgresError, extractPostgresErrorTags } from '@/lib/finance/postgres-error-translator'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-708 Slice 6 — Adopcion manual de signal a payment canonico.
 *
 * Capability requerida: `finance.cash.adopt-external-signal` (scope: space).
 * Body: { accountId: string, notes?: string }
 *
 * El handler verifica capability, valida cuenta via parseAccountId, ejecuta la
 * adopcion en una transaccion (signal + payment + UPDATE) y reporta resultado.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertPaymentInstrumentCapability({
      tenant,
      capability: 'finance.cash.adopt-external-signal',
      action: 'create'
    })

    const { id: signalId } = await context.params
    const body = await request.json().catch(() => ({}))
    const accountId = normalizeString(body.accountId)
    const notes = body.notes ? normalizeString(body.notes).slice(0, 500) : null

    if (!accountId) {
      throw new FinanceValidationError('accountId es obligatorio.', 400)
    }

    const result = await adoptSignalManually({
      signalId,
      accountId,
      actorUserId: tenant.userId,
      notes
    })

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    if (error instanceof InvalidAccountIdError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const translated = translatePostgresError(error)

    if (translated) {
      captureWithDomain(error, 'finance', {
        tags: { source: 'finance_admin', op: 'external_signals_adopt', ...extractPostgresErrorTags(error) }
      })

      return NextResponse.json({ error: translated.message }, { status: translated.statusCode })
    }

    captureWithDomain(error, 'finance', { tags: { source: 'finance_admin', op: 'external_signals_adopt' } })

    return NextResponse.json({ error: 'Error al adoptar la señal.' }, { status: 500 })
  }
}
