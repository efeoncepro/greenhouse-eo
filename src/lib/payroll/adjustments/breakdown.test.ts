// TASK-745d — Tests for breakdown helper (puro, idempotente).

import { describe, expect, it } from 'vitest'

import type { PayrollAdjustment } from '@/types/payroll-adjustments'

import { getEntryAdjustmentBreakdown } from './breakdown'

const adj = (over: Partial<PayrollAdjustment>): PayrollAdjustment => ({
  adjustmentId: 'A-' + Math.random().toString(36).slice(2, 8),
  payrollEntryId: 'E1',
  memberId: 'M1',
  periodId: 'P1',
  kind: 'fixed_deduction',
  payload: { amount: 0 },
  sourceKind: 'manual',
  sourceRef: null,
  reasonCode: 'other',
  reasonNote: 'test',
  status: 'active',
  requestedBy: 'u1',
  requestedAt: '2026-05-01T00:00:00Z',
  approvedBy: null,
  approvedAt: null,
  revertedBy: null,
  revertedAt: null,
  revertedReason: null,
  supersededBy: null,
  effectiveAt: '2026-05-01T00:00:00Z',
  version: 1,
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  ...over
})

describe('getEntryAdjustmentBreakdown', () => {
  it('sin adjustments — todo en estado neutro', () => {
    const r = getEntryAdjustmentBreakdown([])

    expect(r.hasActiveAdjustments).toBe(false)
    expect(r.excluded).toBeNull()
    expect(r.factorApplied).toBe(1)
    expect(r.fixedDeductions).toEqual([])
    expect(r.manualOverride).toBeNull()
    expect(r.totalFixedDeductionAmount).toBe(0)
  })

  it('exclude activo populates excluded entry con reason label', () => {
    const r = getEntryAdjustmentBreakdown([
      adj({ kind: 'exclude', payload: {}, reasonCode: 'no_activity' })
    ])

    expect(r.excluded).not.toBeNull()
    expect(r.excluded?.reasonCode).toBe('no_activity')
    expect(r.excluded?.reasonLabel).toBe('Sin actividad este periodo')
  })

  it('factor multiplicativo se compone', () => {
    const r = getEntryAdjustmentBreakdown([
      adj({ kind: 'gross_factor', payload: { factor: 0.5 } }),
      adj({ kind: 'gross_factor', payload: { factor: 0.8 } })
    ])

    expect(r.factorApplied).toBe(0.4)
  })

  it('fixed_deduction USD lista entry con currency y motivo', () => {
    const r = getEntryAdjustmentBreakdown([
      adj({
        kind: 'fixed_deduction',
        payload: { amount: 95, currency: 'USD' },
        reasonCode: 'advance_payback',
        reasonNote: 'Anticipo de marzo'
      })
    ])

    expect(r.fixedDeductions).toHaveLength(1)
    expect(r.fixedDeductions[0].amount).toBe(95)
    expect(r.fixedDeductions[0].currency).toBe('USD')
    expect(r.fixedDeductions[0].reasonLabel).toBe('Devolucion de anticipo')
    expect(r.totalFixedDeductionAmount).toBe(95)
  })

  it('multiples fixed_deductions se suman', () => {
    const r = getEntryAdjustmentBreakdown([
      adj({ kind: 'fixed_deduction', payload: { amount: 50, currency: 'USD' } }),
      adj({ kind: 'fixed_deduction', payload: { amount: 30, currency: 'USD' } })
    ])

    expect(r.totalFixedDeductionAmount).toBe(80)
    expect(r.fixedDeductions).toHaveLength(2)
  })

  it('manual_override usa netAmount canonico', () => {
    const r = getEntryAdjustmentBreakdown([
      adj({
        kind: 'manual_override',
        payload: { netAmount: 1500, currency: 'USD' },
        reasonCode: 'correction_prior_period'
      })
    ])

    expect(r.manualOverride?.netAmount).toBe(1500)
    expect(r.manualOverride?.currency).toBe('USD')
  })

  it('manual_override soporta legacy netClp para back-compat', () => {
    const r = getEntryAdjustmentBreakdown([
      adj({
        kind: 'manual_override',
        payload: { netClp: 250000, currency: 'CLP' },
        reasonCode: 'correction_prior_period'
      })
    ])

    expect(r.manualOverride?.netAmount).toBe(250000)
  })

  it('ignora pending_approval / reverted / superseded', () => {
    const r = getEntryAdjustmentBreakdown([
      adj({ kind: 'fixed_deduction', payload: { amount: 100, currency: 'CLP' }, status: 'pending_approval' }),
      adj({ kind: 'fixed_deduction', payload: { amount: 200, currency: 'CLP' }, status: 'reverted' }),
      adj({ kind: 'gross_factor', payload: { factor: 0.5 }, status: 'superseded' })
    ])

    expect(r.hasActiveAdjustments).toBe(false)
    expect(r.factorApplied).toBe(1)
    expect(r.fixedDeductions).toEqual([])
  })

  it('idempotente — mismo input, mismo output', () => {
    const adjs = [
      adj({ kind: 'gross_factor', payload: { factor: 0.7 } }),
      adj({ kind: 'fixed_deduction', payload: { amount: 50, currency: 'USD' } })
    ]

    const a = getEntryAdjustmentBreakdown(adjs)
    const b = getEntryAdjustmentBreakdown(adjs)

    expect(a).toEqual(b)
  })
})
