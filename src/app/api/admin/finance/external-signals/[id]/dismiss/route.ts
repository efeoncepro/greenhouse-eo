import { NextResponse } from 'next/server'

import { dismissSignal } from '@/lib/finance/external-cash-signals'
import {
  assertPaymentInstrumentCapability
} from '@/lib/finance/payment-instruments/access'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-708 Slice 6 — Descarte manual de signal con razon obligatoria.
 *
 * Capability requerida: `finance.cash.dismiss-external-signal` (scope: space).
 * Body: { reason: string }  (minimo 8 caracteres).
 *
 * No borra el row — marca account_resolution_status='dismissed' + superseded_at +
 * superseded_reason. Audit preservado.
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
      capability: 'finance.cash.dismiss-external-signal',
      action: 'update'
    })

    const { id: signalId } = await context.params
    const body = await request.json().catch(() => ({}))
    const reason = normalizeString(body.reason)

    const result = await dismissSignal({
      signalId,
      reason,
      actorUserId: tenant.userId
    })

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    captureWithDomain(error, 'finance', { tags: { source: 'finance_admin', op: 'external_signals_dismiss' } })

    return NextResponse.json({ error: 'Error al descartar la señal.' }, { status: 500 })
  }
}
