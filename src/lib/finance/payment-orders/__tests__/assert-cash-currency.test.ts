import { describe, expect, it } from 'vitest'

import { assertPaymentOrderCashCurrency, PaymentOrderValidationError } from '../errors'

/**
 * TASK-995 Slice 4 — una orden de pago nunca puede denominarse en una unidad
 * indexada (UF/CLF). Una obligación CLF liquida en CLP. Defensa en profundidad
 * sobre el CHECK de DB (payment_orders.currency ∈ {CLP,USD}).
 */
describe('assertPaymentOrderCashCurrency (TASK-995)', () => {
  it('acepta monedas cash (CLP/USD/MXN)', () => {
    expect(() => assertPaymentOrderCashCurrency('CLP')).not.toThrow()
    expect(() => assertPaymentOrderCashCurrency('USD')).not.toThrow()
    expect(() => assertPaymentOrderCashCurrency('MXN')).not.toThrow()
  })

  it('rechaza CLF con code unsupported_currency', () => {
    try {
      assertPaymentOrderCashCurrency('CLF')
      throw new Error('debió lanzar')
    } catch (err) {
      expect(err).toBeInstanceOf(PaymentOrderValidationError)
      expect((err as PaymentOrderValidationError).code).toBe('unsupported_currency')
      expect((err as PaymentOrderValidationError).statusCode).toBe(400)
    }
  })

  it('rechaza CLF en minúscula (case-insensitive)', () => {
    expect(() => assertPaymentOrderCashCurrency('clf')).toThrow(PaymentOrderValidationError)
  })
})
