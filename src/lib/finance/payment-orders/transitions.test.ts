import { describe, expect, it } from 'vitest'

import type { PaymentOrderState } from '@/types/payment-orders'

import {
  PaymentOrderInvalidStateTransitionError,
  PaymentOrderMissingSourceAccountError
} from './errors'
import {
  STATES_REQUIRING_SOURCE_ACCOUNT,
  assertSourceAccountForPaid,
  assertValidPaymentOrderStateTransition,
  isValidPaymentOrderStateTransition
} from './transitions'

// TASK-765 Slice 1 + Slice 6 contract tests. La matrix de transiciones es la
// fuente de verdad TS y debe espejar el trigger PG anti-zombie de slice 6.
// Si una de las dos cambia sin la otra, este test falla.

describe('payment-orders transitions', () => {
  describe('isValidPaymentOrderStateTransition', () => {
    it('admite todas las transiciones happy path', () => {
      const happyPath: Array<[PaymentOrderState, PaymentOrderState]> = [
        ['draft', 'pending_approval'],
        ['pending_approval', 'approved'],
        ['approved', 'submitted'],
        ['submitted', 'paid'],
        ['paid', 'settled'],
        ['settled', 'closed']
      ]

      for (const [from, to] of happyPath) {
        expect(isValidPaymentOrderStateTransition(from, to)).toBe(true)
      }
    })

    it('admite cancelacion desde estados pre-paid', () => {
      const cancellable: PaymentOrderState[] = [
        'draft',
        'pending_approval',
        'approved',
        'scheduled',
        'submitted',
        'paid',
        'failed'
      ]

      for (const from of cancellable) {
        expect(isValidPaymentOrderStateTransition(from, 'cancelled')).toBe(true)
      }
    })

    it('admite retry path failed -> approved', () => {
      expect(isValidPaymentOrderStateTransition('failed', 'approved')).toBe(true)
    })

    it('rechaza transiciones invalidas conocidas', () => {
      const invalid: Array<[PaymentOrderState, PaymentOrderState]> = [
        ['paid', 'submitted'], // regression invalida
        ['paid', 'approved'],
        ['cancelled', 'approved'], // estado terminal
        ['closed', 'paid'], // estado terminal
        ['draft', 'paid'], // skipping approval
        ['pending_approval', 'paid'], // skipping
        ['settled', 'cancelled'] // settlement cerrado
      ]

      for (const [from, to] of invalid) {
        expect(isValidPaymentOrderStateTransition(from, to)).toBe(false)
      }
    })

    it('admite idempotencia (mismo estado)', () => {
      // Re-aplicar el mismo estado es no-op valido (e.g. retry seguro).
      const states: PaymentOrderState[] = ['draft', 'paid', 'settled', 'closed']

      for (const s of states) {
        expect(isValidPaymentOrderStateTransition(s, s)).toBe(true)
      }
    })
  })

  describe('assertValidPaymentOrderStateTransition', () => {
    it('no lanza para transicion valida', () => {
      expect(() =>
        assertValidPaymentOrderStateTransition('por-1', 'submitted', 'paid')
      ).not.toThrow()
    })

    it('lanza PaymentOrderInvalidStateTransitionError con detalle correcto', () => {
      try {
        assertValidPaymentOrderStateTransition('por-zombie', 'paid', 'submitted')
        expect.fail('debio lanzar')
      } catch (err) {
        expect(err).toBeInstanceOf(PaymentOrderInvalidStateTransitionError)
        const e = err as PaymentOrderInvalidStateTransitionError

        expect(e.code).toBe('invalid_state_transition')
        expect(e.statusCode).toBe(409)
        expect(e.orderId).toBe('por-zombie')
        expect(e.fromState).toBe('paid')
        expect(e.toState).toBe('submitted')
      }
    })
  })

  describe('assertSourceAccountForPaid', () => {
    it('no lanza cuando state no es terminal', () => {
      expect(() => assertSourceAccountForPaid('por-1', null, 'draft')).not.toThrow()
      expect(() => assertSourceAccountForPaid('por-1', null, 'submitted')).not.toThrow()
      expect(() => assertSourceAccountForPaid('por-1', null, 'cancelled')).not.toThrow()
    })

    it('no lanza cuando hay sourceAccountId aunque state sea terminal', () => {
      expect(() => assertSourceAccountForPaid('por-1', 'acc-santander-clp', 'paid')).not.toThrow()
      expect(() => assertSourceAccountForPaid('por-1', 'acc-santander-clp', 'settled')).not.toThrow()
      expect(() => assertSourceAccountForPaid('por-1', 'acc-santander-clp', 'closed')).not.toThrow()
    })

    it('lanza PaymentOrderMissingSourceAccountError cuando state es terminal y sourceAccountId NULL', () => {
      const cases: Array<{ targetState: PaymentOrderState; value: string | null | undefined }> = [
        { targetState: 'paid', value: null },
        { targetState: 'paid', value: undefined },
        { targetState: 'paid', value: '' },
        { targetState: 'paid', value: '   ' },
        { targetState: 'settled', value: null },
        { targetState: 'closed', value: null }
      ]

      for (const { targetState, value } of cases) {
        try {
          assertSourceAccountForPaid('por-incident', value, targetState)
          expect.fail(`debio lanzar para state=${targetState} value=${String(value)}`)
        } catch (err) {
          expect(err).toBeInstanceOf(PaymentOrderMissingSourceAccountError)
          const e = err as PaymentOrderMissingSourceAccountError

          expect(e.code).toBe('source_account_required')
          expect(e.statusCode).toBe(422)
          expect(e.orderId).toBe('por-incident')
        }
      }
    })
  })

  describe('STATES_REQUIRING_SOURCE_ACCOUNT', () => {
    it('coincide con los estados terminales del CHECK constraint', () => {
      // Sincronia con migration 20260502182643869:
      // CHECK (state IN ('draft','pending_approval','approved','submitted','cancelled','failed')
      //        OR source_account_id IS NOT NULL)
      // -> estados que requieren NOT NULL = paid, settled, closed.
      expect([...STATES_REQUIRING_SOURCE_ACCOUNT].sort()).toEqual(
        ['closed', 'paid', 'settled'].sort()
      )
    })
  })
})
