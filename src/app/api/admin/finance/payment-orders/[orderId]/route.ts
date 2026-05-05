import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getPaymentOrderWithLines } from '@/lib/finance/payment-orders/list-orders'
import {
  PaymentOrderConflictError,
  PaymentOrderValidationError
} from '@/lib/finance/payment-orders/errors'
import { validatePaymentOrderSourceAccount } from '@/lib/finance/payment-orders/source-instrument-policy'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  try {
    const order = await getPaymentOrderWithLines(orderId)

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error(`GET /api/admin/finance/payment-orders/${orderId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible cargar la orden de pago.' },
      { status: 500 }
    )
  }
}

// TASK-765 Slice 1: PATCH para asignar/cambiar source_account_id mientras la
// orden este en estado pre-paid. El operator usa este endpoint desde el
// detail drawer cuando la UI bloquea "Marcar pagada" por falta de cuenta
// origen. Tambien lo usa el endpoint de recovery (slice 8) para reparar
// las dos ordenes zombie del incidente 2026-05-01.
const PATCHABLE_STATES = new Set([
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'submitted'
])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  try {
    const body = await request.json().catch(() => ({}))

    const sourceAccountId =
      typeof body?.sourceAccountId === 'string' && body.sourceAccountId.trim()
        ? body.sourceAccountId.trim()
        : null

    if (!sourceAccountId) {
      throw new PaymentOrderValidationError('sourceAccountId requerido', 'validation_error')
    }

    // Validar estado actual
    const orderRows = await query<{
      state: string
      processor_slug: string | null
      payment_method: string | null
      currency: string
      metadata_json: Record<string, unknown> | null
    }>(
      `SELECT state, processor_slug, payment_method, currency, metadata_json
         FROM greenhouse_finance.payment_orders
        WHERE order_id = $1
        LIMIT 1`,
      [orderId]
    )

    if (orderRows.length === 0) {
      throw new PaymentOrderValidationError(`Order ${orderId} no existe`, 'validation_error', 404)
    }

    const currentState = orderRows[0].state

    if (!PATCHABLE_STATES.has(currentState)) {
      throw new PaymentOrderConflictError(
        `No se puede cambiar la cuenta origen en estado '${currentState}'. Solo: ${[...PATCHABLE_STATES].join(', ')}`,
        'invalid_state_transition'
      )
    }

    const policy = await validatePaymentOrderSourceAccount(
      {
        query: async <T extends Record<string, unknown>>(text: string, values?: unknown[]) => ({
          rows: await query<T>(text, values ?? [])
        })
      },
      {
        processorSlug: orderRows[0].processor_slug,
        paymentMethod: orderRows[0].payment_method,
        currency: orderRows[0].currency,
        sourceAccountId
      }
    )

    await query(
      `UPDATE greenhouse_finance.payment_orders
          SET source_account_id = $2,
              metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object('treasury_source_policy', $3::jsonb),
              updated_at = now()
        WHERE order_id = $1`,
      [orderId, sourceAccountId, JSON.stringify(policy.snapshot)]
    )

    const order = await getPaymentOrderWithLines(orderId)

    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof PaymentOrderValidationError || error instanceof PaymentOrderConflictError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    console.error(`PATCH order ${orderId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible actualizar la orden.' },
      { status: 500 }
    )
  }
}
