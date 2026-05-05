// TASK-765 Slice 1: Tipos de error estables para el path
// payment_order.paid -> bank settlement. Los codigos son contrato publico:
// el UI los mapea a microcopy es-CL, el reactive worker los rutea por
// error_class, y los tests verifican estabilidad.

export type PaymentOrderErrorCode =
  // Generic
  | 'validation_error'
  | 'conflict'
  | 'not_found'
  // State machine
  | 'invalid_state'
  | 'invalid_state_transition'
  // Slice 1 — source_account hard-gate
  | 'source_account_required'
  | 'source_account_inactive'
  | 'source_account_not_found'
  | 'processor_cannot_be_source_account'
  // Slice 4 — resolver loud
  | 'expense_unresolved'
  | 'settlement_blocked'
  | 'cutover_violation'
  | 'materializer_dead_letter'
  | 'out_of_scope_v1'
  // Pre-existing mutators (TASK-748/750 path) — preservados como contrato.
  | 'obligation_status_blocked'
  | 'obligation_already_locked'
  | 'obligation_not_found'
  | 'maker_checker_violation'
  | 'mixed_currencies'
  | 'invalid_amount'
  | 'amount_exceeds_obligation'

export class PaymentOrderValidationError extends Error {
  statusCode: number
  code: PaymentOrderErrorCode

  constructor(message: string, code: PaymentOrderErrorCode = 'validation_error', statusCode = 400) {
    super(message)
    this.name = 'PaymentOrderValidationError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class PaymentOrderConflictError extends Error {
  statusCode: number
  code: PaymentOrderErrorCode

  constructor(message: string, code: PaymentOrderErrorCode = 'conflict', statusCode = 409) {
    super(message)
    this.name = 'PaymentOrderConflictError'
    this.code = code
    this.statusCode = statusCode
  }
}

// Slice 1 - Hard-gate: una order no puede transicionar a paid/settled/closed
// sin source_account_id. CHECK constraint a nivel DB es la red de seguridad
// estatica; este error es el path canonico TS que el UI captura para mostrar
// el banner "Selecciona la cuenta origen" en es-CL.
export class PaymentOrderMissingSourceAccountError extends Error {
  statusCode = 422
  code: PaymentOrderErrorCode = 'source_account_required'
  orderId: string

  constructor(orderId: string, detail = 'La orden no tiene cuenta bancaria origen') {
    super(`[source_account_required] order=${orderId}: ${detail}`)
    this.name = 'PaymentOrderMissingSourceAccountError'
    this.orderId = orderId
  }
}

// Slice 6 - State machine hardening: transicion no permitida segun matrix
// canonico. Lanzado por isValidPaymentOrderStateTransition / asserta el
// trigger PG anti-zombie.
export class PaymentOrderInvalidStateTransitionError extends Error {
  statusCode = 409
  code: PaymentOrderErrorCode = 'invalid_state_transition'
  orderId: string
  fromState: string
  toState: string

  constructor(orderId: string, fromState: string, toState: string) {
    super(
      `[invalid_state_transition] order=${orderId}: ${fromState} -> ${toState} no esta en la matrix permitida`
    )
    this.name = 'PaymentOrderInvalidStateTransitionError'
    this.orderId = orderId
    this.fromState = fromState
    this.toState = toState
  }
}

// Slice 4 - Resolver loud: lookup de greenhouse_finance.expenses fallo aun
// despues de invocar materializePayrollExpensesForExportedPeriod. El
// proyector throw esto en lugar de skipear silencioso.
export class PaymentOrderExpenseUnresolvedError extends Error {
  statusCode = 422
  code: PaymentOrderErrorCode = 'expense_unresolved'
  orderId: string
  lineId: string
  periodId: string | null
  memberId: string | null

  constructor(orderId: string, lineId: string, periodId: string | null, memberId: string | null) {
    super(
      `[expense_unresolved] order=${orderId} line=${lineId}: no existe greenhouse_finance.expenses para period=${periodId} member=${memberId}`
    )
    this.name = 'PaymentOrderExpenseUnresolvedError'
    this.orderId = orderId
    this.lineId = lineId
    this.periodId = periodId
    this.memberId = memberId
  }
}

// Slice 4 - Resolver loud: wrapper para cualquier failure downstream
// (CHECK constraint, FK, race) que bloquee la creacion de expense_payment +
// settlement_leg. Reason estructurada para audit + outbox event.
export type PaymentOrderSettlementBlockedReason =
  | 'expense_unresolved'
  | 'account_missing'
  | 'cutover_violation'
  | 'materializer_dead_letter'
  | 'out_of_scope_v1'
  | 'unknown'

export class PaymentOrderSettlementBlockedError extends Error {
  statusCode = 422
  code: PaymentOrderErrorCode = 'settlement_blocked'
  orderId: string
  reason: PaymentOrderSettlementBlockedReason
  lineId: string | null

  constructor(
    orderId: string,
    reason: PaymentOrderSettlementBlockedReason,
    detail: string,
    lineId: string | null = null
  ) {
    super(`[settlement_blocked:${reason}] order=${orderId}${lineId ? ` line=${lineId}` : ''}: ${detail}`)
    this.name = 'PaymentOrderSettlementBlockedError'
    this.orderId = orderId
    this.reason = reason
    this.lineId = lineId
  }
}

// Type guard para code dispatch sin acoplar al name (que cambia con minify).
export const isPaymentOrderError = (err: unknown): err is { code: PaymentOrderErrorCode; statusCode: number; message: string } => {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    'statusCode' in err &&
    typeof (err as { code: unknown }).code === 'string'
  )
}
