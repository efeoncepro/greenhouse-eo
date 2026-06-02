import { describe, expect, it } from 'vitest'

import {
  ContractorPayableTransitionError,
  assertValidPayableTransition,
  isTerminalPayableStatus,
  isValidPayableTransition
} from './state-machine'
import { CONTRACTOR_PAYABLE_STATUSES } from './types'

describe('contractor payable state machine (TASK-793)', () => {
  it('allows same-status no-op for every status', () => {
    for (const status of CONTRACTOR_PAYABLE_STATUSES) {
      expect(isValidPayableTransition(status, status)).toBe(true)
    }
  })

  it('allows the canonical forward path to paid', () => {
    expect(isValidPayableTransition('pending_readiness', 'ready_for_finance')).toBe(true)
    expect(isValidPayableTransition('ready_for_finance', 'obligation_created')).toBe(true)
    expect(isValidPayableTransition('obligation_created', 'payment_order_created')).toBe(true)
    expect(isValidPayableTransition('payment_order_created', 'paid')).toBe(true)
  })

  it('allows blocked recovery + cancellation from non-terminal states', () => {
    expect(isValidPayableTransition('pending_readiness', 'blocked')).toBe(true)
    expect(isValidPayableTransition('ready_for_finance', 'blocked')).toBe(true)
    expect(isValidPayableTransition('blocked', 'pending_readiness')).toBe(true)
    expect(isValidPayableTransition('pending_readiness', 'cancelled')).toBe(true)
    expect(isValidPayableTransition('obligation_created', 'cancelled')).toBe(true)
  })

  it('forbids transitions out of terminal states', () => {
    expect(isValidPayableTransition('paid', 'cancelled')).toBe(false)
    expect(isValidPayableTransition('cancelled', 'pending_readiness')).toBe(false)
    expect(isTerminalPayableStatus('paid')).toBe(true)
    expect(isTerminalPayableStatus('cancelled')).toBe(true)
    expect(isTerminalPayableStatus('obligation_created')).toBe(false)
  })

  it('forbids illegal jumps', () => {
    expect(isValidPayableTransition('pending_readiness', 'obligation_created')).toBe(false)
    expect(isValidPayableTransition('ready_for_finance', 'paid')).toBe(false)
    expect(isValidPayableTransition('obligation_created', 'ready_for_finance')).toBe(false)
    expect(isValidPayableTransition('pending_readiness', 'paid')).toBe(false)
  })

  it('assertValidPayableTransition throws typed error', () => {
    expect(() => assertValidPayableTransition('paid', 'pending_readiness')).toThrow(
      ContractorPayableTransitionError
    )

    try {
      assertValidPayableTransition('ready_for_finance', 'paid')
    } catch (error) {
      expect(error).toBeInstanceOf(ContractorPayableTransitionError)
      expect((error as ContractorPayableTransitionError).code).toBe('invalid_payable_transition')
    }
  })
})
