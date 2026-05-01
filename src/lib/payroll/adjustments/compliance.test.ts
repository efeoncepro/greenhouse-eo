// TASK-745 — Tests for Chile dependent compliance check (TS mirror of DB trigger).

import { describe, expect, it } from 'vitest'

import { checkChileDependentCompliance } from './compliance'

describe('checkChileDependentCompliance', () => {
  it('honorarios siempre pasa, cualquier reason', () => {
    const r = checkChileDependentCompliance({
      payRegime: 'chile',
      contractTypeSnapshot: 'honorarios',
      kind: 'exclude',
      payload: {},
      reasonCode: 'no_activity'
    })

    expect(r).toBeNull()
  })

  it('international siempre pasa', () => {
    const r = checkChileDependentCompliance({
      payRegime: 'international',
      contractTypeSnapshot: 'contractor',
      kind: 'exclude',
      payload: {},
      reasonCode: 'low_performance'
    })

    expect(r).toBeNull()
  })

  it('chile indefinido + exclude + low_performance => bloquea', () => {
    const r = checkChileDependentCompliance({
      payRegime: 'chile',
      contractTypeSnapshot: 'indefinido',
      kind: 'exclude',
      payload: {},
      reasonCode: 'low_performance'
    })

    expect(r).toContain('motivo legal')
  })

  it('chile indefinido + exclude + leave_unpaid => permite', () => {
    const r = checkChileDependentCompliance({
      payRegime: 'chile',
      contractTypeSnapshot: 'indefinido',
      kind: 'exclude',
      payload: {},
      reasonCode: 'leave_unpaid'
    })

    expect(r).toBeNull()
  })

  it('chile plazo_fijo + factor 0 + agreed_discount => bloquea', () => {
    const r = checkChileDependentCompliance({
      payRegime: 'chile',
      contractTypeSnapshot: 'plazo_fijo',
      kind: 'gross_factor',
      payload: { factor: 0 },
      reasonCode: 'agreed_discount'
    })

    expect(r).toContain('motivo legal')
  })

  it('chile dependiente + factor 0.5 (no cero) => permite cualquier reason', () => {
    const r = checkChileDependentCompliance({
      payRegime: 'chile',
      contractTypeSnapshot: 'indefinido',
      kind: 'gross_factor',
      payload: { factor: 0.5 },
      reasonCode: 'low_performance'
    })

    expect(r).toBeNull()
  })

  it('chile dependiente + fixed_deduction => permite cualquier reason', () => {
    const r = checkChileDependentCompliance({
      payRegime: 'chile',
      contractTypeSnapshot: 'indefinido',
      kind: 'fixed_deduction',
      payload: { amount: 100_000 },
      reasonCode: 'advance_payback'
    })

    expect(r).toBeNull()
  })

  it('chile + termination_pending + exclude => permite', () => {
    const r = checkChileDependentCompliance({
      payRegime: 'chile',
      contractTypeSnapshot: 'indefinido',
      kind: 'exclude',
      payload: {},
      reasonCode: 'termination_pending'
    })

    expect(r).toBeNull()
  })
})
