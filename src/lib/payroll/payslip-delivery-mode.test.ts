import { afterEach, describe, expect, it } from 'vitest'

import {
  getPaymentDeliveryMode,
  shouldSendOnExport,
  shouldSendOnPayment
} from './payslip-delivery-mode'

const ORIGINAL_VALUE = process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE

afterEach(() => {
  if (ORIGINAL_VALUE === undefined) {
    delete process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE
  } else {
    process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE = ORIGINAL_VALUE
  }
})

describe('payslip delivery mode flag (TASK-759)', () => {
  it('defaults to legacy_export when env var is unset', () => {
    delete process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE
    expect(getPaymentDeliveryMode()).toBe('legacy_export')
    expect(shouldSendOnExport()).toBe(true)
    expect(shouldSendOnPayment()).toBe(false)
  })

  it('defaults to legacy_export when env var is invalid', () => {
    process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE = 'something_random'
    expect(getPaymentDeliveryMode()).toBe('legacy_export')
    expect(shouldSendOnExport()).toBe(true)
    expect(shouldSendOnPayment()).toBe(false)
  })

  it('respects on_payment_paid mode', () => {
    process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE = 'on_payment_paid'
    expect(getPaymentDeliveryMode()).toBe('on_payment_paid')
    expect(shouldSendOnExport()).toBe(false)
    expect(shouldSendOnPayment()).toBe(true)
  })

  it('respects both mode (transition)', () => {
    process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE = 'both'
    expect(getPaymentDeliveryMode()).toBe('both')
    expect(shouldSendOnExport()).toBe(true)
    expect(shouldSendOnPayment()).toBe(true)
  })

  it('is case-insensitive and trims whitespace', () => {
    process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE = '  ON_PAYMENT_PAID  '
    expect(getPaymentDeliveryMode()).toBe('on_payment_paid')
  })
})
