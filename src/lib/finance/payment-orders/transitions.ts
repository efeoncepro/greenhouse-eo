import type { PaymentOrderState } from '@/types/payment-orders'

import {
  PaymentOrderInvalidStateTransitionError,
  PaymentOrderMissingSourceAccountError
} from './errors'

// TASK-765 Slice 1 + Slice 6: helpers centralizados para validar
// transiciones de estado de payment_orders. Hoy la validacion vive inline
// en cada mutador (approve-order, mark-paid, cancel-order, etc) — esto
// las consolida sin reescribirlas. Los mutadores pueden invocar estos
// helpers para emitir errores tipados consistentes.
//
// La matrix de abajo es la unica fuente de verdad TS de transiciones
// permitidas. El trigger PG anti-zombie (slice 6) la mirrorea en SQL para
// defense in depth — ambos deben mantenerse sincronizados (test de paridad
// en transitions.test.ts).

const TRANSITION_MATRIX: Record<PaymentOrderState, ReadonlySet<PaymentOrderState>> = {
  draft: new Set(['pending_approval', 'cancelled']),
  pending_approval: new Set(['approved', 'cancelled', 'draft']),
  approved: new Set(['scheduled', 'submitted', 'paid', 'cancelled']),
  scheduled: new Set(['submitted', 'paid', 'cancelled']),
  submitted: new Set(['paid', 'failed', 'cancelled']),
  paid: new Set(['settled', 'cancelled']),
  settled: new Set(['closed']),
  closed: new Set([]),
  failed: new Set(['approved', 'cancelled']),
  cancelled: new Set([])
}

/**
 * Devuelve `true` si la transicion `from -> to` esta permitida por la
 * matrix canonica. No lanza — usa para validacion preventiva en UI.
 *
 * Para enforcement con throw tipado, usar `assertValidPaymentOrderStateTransition`.
 */
export const isValidPaymentOrderStateTransition = (
  from: PaymentOrderState,
  to: PaymentOrderState
): boolean => {
  if (from === to) return true // idempotencia: re-aplicar mismo estado es no-op valido

  const allowed = TRANSITION_MATRIX[from]

  return allowed?.has(to) ?? false
}

/**
 * Lanza `PaymentOrderInvalidStateTransitionError` si la transicion no es
 * permitida. Usar en mutators antes del UPDATE para producir error
 * tipado y consistente con el trigger PG anti-zombie.
 */
export const assertValidPaymentOrderStateTransition = (
  orderId: string,
  from: PaymentOrderState,
  to: PaymentOrderState
): void => {
  if (!isValidPaymentOrderStateTransition(from, to)) {
    throw new PaymentOrderInvalidStateTransitionError(orderId, from, to)
  }
}

/**
 * Slice 1 hard-gate: asserta que una orden que esta a punto de
 * transicionar a un estado terminal (paid/settled/closed) tenga
 * `source_account_id` poblado. Lanza `PaymentOrderMissingSourceAccountError`
 * si no — el API route lo mapea a 422 con codigo `source_account_required`,
 * el UI lo captura para mostrar banner es-CL.
 *
 * Esto es complementario al CHECK constraint de slice 1 + el trigger PG
 * anti-zombie de slice 6. El error TS es la fuente de mensajes legibles
 * para el operator; el CHECK + trigger son la red de seguridad estatica.
 */
export const assertSourceAccountForPaid = (
  orderId: string,
  sourceAccountId: string | null | undefined,
  targetState: PaymentOrderState
): void => {
  const TERMINAL_STATES: ReadonlySet<PaymentOrderState> = new Set([
    'paid',
    'settled',
    'closed'
  ])

  if (!TERMINAL_STATES.has(targetState)) return

  if (!sourceAccountId || sourceAccountId.trim() === '') {
    throw new PaymentOrderMissingSourceAccountError(
      orderId,
      `Para marcar la orden como ${targetState} debe tener cuenta bancaria origen seleccionada`
    )
  }
}

/**
 * Estados que requieren `source_account_id NOT NULL`. Coincide con el
 * CHECK constraint `payment_orders_source_account_required_when_paid` en
 * la migracion 20260502182643869. Util para queries de drift detection
 * y para el reliability signal `paid_orders_without_expense_payment`.
 */
export const STATES_REQUIRING_SOURCE_ACCOUNT: ReadonlySet<PaymentOrderState> = new Set([
  'paid',
  'settled',
  'closed'
])
