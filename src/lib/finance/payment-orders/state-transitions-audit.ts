import 'server-only'

import type { PoolClient } from 'pg'

import type { PaymentOrderState } from '@/types/payment-orders'

// TASK-765 Slice 6: Helper canonico para escribir el audit log de
// transiciones de estado de payment_orders. Append-only enforced via
// trigger PG (slice 6 migration 20260502185238542). Cualquier mutador
// de estado (mark-paid, approve, submit, cancel, schedule, recover)
// debe invocar este helper dentro de la misma transaccion del UPDATE
// para que la trazabilidad sea atomica con el cambio.

export interface RecordPaymentOrderStateTransitionInput {
  orderId: string
  fromState: PaymentOrderState | 'unknown_legacy'
  toState: PaymentOrderState
  actorUserId: string | null
  reason: string
  metadata?: Record<string, unknown>
}

export interface RecordedStateTransition {
  transitionId: string
  orderId: string
  fromState: string
  toState: string
  occurredAt: string
}

const generateTransitionId = (orderId: string): string => {
  // Formato: pst-<timestamp>-<orderId-suffix>
  // Mantiene legibilidad (transition-id estable y trazable a la order),
  // unicidad (timestamp + suffix), y compatibilidad con strings TEXT del schema.
  const ts = Date.now()
  const suffix = orderId.slice(-12)

  return `pst-${ts}-${suffix}`
}

/**
 * Inserta una fila en `greenhouse_finance.payment_order_state_transitions`.
 * Idempotencia: el `transition_id` es unique pero NO se basa en hash determinista
 * — un retry produce un nuevo transition_id. Si el caller necesita exactamente-una
 * fila por intent, debe wrappear en transaccion + check de duplicados (e.g.
 * mark-paid-atomic skipea si ya hay row para este (order, to_state) en los
 * ultimos 30 segundos).
 *
 * Usar siempre con `client?: PoolClient` para que la fila se commitee con el
 * UPDATE de `payment_orders.state` y nunca queden desincronizadas.
 */
export const recordPaymentOrderStateTransition = async (
  input: RecordPaymentOrderStateTransitionInput,
  client: PoolClient
): Promise<RecordedStateTransition> => {
  const transitionId = generateTransitionId(input.orderId)

  const result = await client.query<{
    transition_id: string
    order_id: string
    from_state: string
    to_state: string
    occurred_at: string
  }>(
    `
      INSERT INTO greenhouse_finance.payment_order_state_transitions (
        transition_id, order_id, from_state, to_state,
        actor_user_id, reason, metadata_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING
        transition_id, order_id, from_state, to_state,
        occurred_at::text AS occurred_at
    `,
    [
      transitionId,
      input.orderId,
      input.fromState,
      input.toState,
      input.actorUserId,
      input.reason,
      JSON.stringify(input.metadata ?? {})
    ]
  )

  const row = result.rows[0]

  return {
    transitionId: row.transition_id,
    orderId: row.order_id,
    fromState: row.from_state,
    toState: row.to_state,
    occurredAt: row.occurred_at
  }
}
