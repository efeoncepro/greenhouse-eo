import { describe, expect, it } from 'vitest'

import { buildReactiveHandlerKey } from './reactive-consumer'

describe('buildReactiveHandlerKey', () => {
  it('keeps the handler key scoped to projection name and event type', () => {
    expect(buildReactiveHandlerKey('payroll_receipts_delivery', 'payroll_period.exported'))
      .toBe('payroll_receipts_delivery:payroll_period.exported')
    expect(buildReactiveHandlerKey('projected_payroll', 'payroll_period.exported'))
      .toBe('projected_payroll:payroll_period.exported')
    expect(buildReactiveHandlerKey('payroll_receipts_delivery', 'payroll_period.exported'))
      .not.toBe(buildReactiveHandlerKey('projected_payroll', 'payroll_period.exported'))
  })
})
