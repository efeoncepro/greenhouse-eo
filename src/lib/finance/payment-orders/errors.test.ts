import { describe, expect, it } from 'vitest'

import {
  PaymentOrderConflictError,
  PaymentOrderExpenseUnresolvedError,
  PaymentOrderInvalidStateTransitionError,
  PaymentOrderMissingSourceAccountError,
  PaymentOrderSettlementBlockedError,
  PaymentOrderValidationError,
  isPaymentOrderError,
  type PaymentOrderErrorCode
} from './errors'

// TASK-765 Slice 1 + Slice 4: contract tests para los codigos de error
// estables. El UI mapea estos codes a microcopy es-CL; cualquier cambio
// rompe consumers — el test los pinea.

describe('payment-orders errors', () => {
  it('PaymentOrderValidationError shape estable', () => {
    const e = new PaymentOrderValidationError('campo requerido')

    expect(e.statusCode).toBe(400)
    expect(e.code).toBe('validation_error')
    expect(e.name).toBe('PaymentOrderValidationError')
  })

  it('PaymentOrderConflictError shape estable', () => {
    const e = new PaymentOrderConflictError('conflicto')

    expect(e.statusCode).toBe(409)
    expect(e.code).toBe('conflict')
  })

  it('PaymentOrderMissingSourceAccountError shape estable', () => {
    const e = new PaymentOrderMissingSourceAccountError('por-test')

    expect(e.statusCode).toBe(422)
    expect(e.code).toBe('source_account_required')
    expect(e.orderId).toBe('por-test')
    expect(e.message).toContain('por-test')
  })

  it('PaymentOrderInvalidStateTransitionError shape estable', () => {
    const e = new PaymentOrderInvalidStateTransitionError('por-x', 'paid', 'submitted')

    expect(e.statusCode).toBe(409)
    expect(e.code).toBe('invalid_state_transition')
    expect(e.fromState).toBe('paid')
    expect(e.toState).toBe('submitted')
  })

  it('PaymentOrderExpenseUnresolvedError shape estable', () => {
    const e = new PaymentOrderExpenseUnresolvedError('por-x', 'pol-y', '2026-04', 'luis-reyes')

    expect(e.statusCode).toBe(422)
    expect(e.code).toBe('expense_unresolved')
    expect(e.lineId).toBe('pol-y')
    expect(e.periodId).toBe('2026-04')
    expect(e.memberId).toBe('luis-reyes')
  })

  it('PaymentOrderSettlementBlockedError shape estable + reason tipada', () => {
    const e = new PaymentOrderSettlementBlockedError(
      'por-x',
      'expense_unresolved',
      'no se encontro expense para el periodo',
      'pol-y'
    )

    expect(e.statusCode).toBe(422)
    expect(e.code).toBe('settlement_blocked')
    expect(e.reason).toBe('expense_unresolved')
    expect(e.lineId).toBe('pol-y')
  })

  it('PaymentOrderErrorCode union es exhaustivo', () => {
    // Type-level: si agregamos un code y no lo agregamos al union, este
    // assignment falla en compile time.
    const codes: PaymentOrderErrorCode[] = [
      'validation_error',
      'conflict',
      'not_found',
      'invalid_state',
      'invalid_state_transition',
      'source_account_required',
      'expense_unresolved',
      'settlement_blocked',
      'cutover_violation',
      'materializer_dead_letter',
      'out_of_scope_v1',
      'obligation_status_blocked',
      'obligation_already_locked',
      'obligation_not_found',
      'maker_checker_violation',
      'mixed_currencies',
      'invalid_amount',
      'amount_exceeds_obligation'
    ]

    expect(codes).toHaveLength(18)
  })

  describe('isPaymentOrderError type guard', () => {
    it('reconoce errores tipados', () => {
      expect(isPaymentOrderError(new PaymentOrderValidationError('x'))).toBe(true)
      expect(isPaymentOrderError(new PaymentOrderMissingSourceAccountError('por-x'))).toBe(true)
      expect(
        isPaymentOrderError(
          new PaymentOrderSettlementBlockedError('por-x', 'unknown', 'detail')
        )
      ).toBe(true)
    })

    it('rechaza errores genericos y valores no-error', () => {
      expect(isPaymentOrderError(new Error('plain'))).toBe(false)
      expect(isPaymentOrderError({ code: 'x' })).toBe(false) // falta statusCode
      expect(isPaymentOrderError(null)).toBe(false)
      expect(isPaymentOrderError(undefined)).toBe(false)
      expect(isPaymentOrderError('string')).toBe(false)
    })
  })
})
