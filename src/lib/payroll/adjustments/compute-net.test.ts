// TASK-745 — Tests for computePayrollEntryNet (puro, idempotente).
// 18+ casos cubriendo: exclude, factor, per-component, fixed_deduction,
// manual_override, composiciones, edge cases, idempotencia.

import { describe, expect, it } from 'vitest'

import type { PayrollAdjustment } from '@/types/payroll-adjustments'

import { computePayrollEntryNet, type PayrollEntryComputeSnapshot } from './compute-net'

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

const honorariosSnap = (gross: number, rate = 0.135): PayrollEntryComputeSnapshot => ({
  payRegime: 'chile',
  contractTypeSnapshot: 'honorarios',
  currency: 'CLP',
  naturalGrossClp: gross,
  components: { base: gross },
  siiRetentionRate: rate
})

const chileDepSnap = (gross: number, deductions: number): PayrollEntryComputeSnapshot => ({
  payRegime: 'chile',
  contractTypeSnapshot: 'indefinido',
  currency: 'CLP',
  naturalGrossClp: gross,
  components: { base: gross },
  siiRetentionRate: null,
  recomputeChileDeductionsClp: g => Math.round(deductions * (gross > 0 ? g / gross : 0))
})

const intlSnap = (gross: number): PayrollEntryComputeSnapshot => ({
  payRegime: 'international',
  contractTypeSnapshot: 'contractor',
  currency: 'USD',
  naturalGrossClp: gross,
  components: { base: gross },
  siiRetentionRate: null
})

describe('computePayrollEntryNet', () => {
  it('1. no adjustments — returns natural gross with full deductions', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [])

    expect(r.excluded).toBe(false)
    expect(r.naturalGrossClp).toBe(500_000)
    expect(r.effectiveGrossClp).toBe(500_000)
    expect(r.factorApplied).toBe(1)
    expect(r.siiRetentionClp).toBe(67_500)
    expect(r.netClp).toBe(432_500)
  })

  it('2. exclude — net=0, gross=0, short-circuit', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({ kind: 'exclude', payload: {}, reasonCode: 'no_activity' })
    ])

    expect(r.excluded).toBe(true)
    expect(r.netClp).toBe(0)
    expect(r.effectiveGrossClp).toBe(0)
    expect(r.siiRetentionClp).toBe(0)
  })

  it('3. gross_factor 0.5 (honorarios) — bruto y SII proporcionales', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({ kind: 'gross_factor', payload: { factor: 0.5 } })
    ])

    expect(r.factorApplied).toBe(0.5)
    expect(r.effectiveGrossClp).toBe(250_000)
    expect(r.siiRetentionClp).toBe(33_750)
    expect(r.netClp).toBe(216_250)
  })

  it('4. gross_factor 0 (honorarios) — pago efectivo cero', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({ kind: 'gross_factor', payload: { factor: 0 }, reasonCode: 'no_activity' })
    ])

    expect(r.factorApplied).toBe(0)
    expect(r.effectiveGrossClp).toBe(0)
    expect(r.siiRetentionClp).toBe(0)
    expect(r.netClp).toBe(0)
  })

  it('5. gross_factor multiplicativo (dos factores)', () => {
    const r = computePayrollEntryNet(honorariosSnap(1_000_000), [
      adj({ kind: 'gross_factor', payload: { factor: 0.5 } }),
      adj({ kind: 'gross_factor', payload: { factor: 0.8 } })
    ])

    // 1_000_000 * 0.5 * 0.8 = 400_000
    expect(r.effectiveGrossClp).toBe(400_000)
    expect(r.factorApplied).toBe(0.4)
    expect(r.siiRetentionClp).toBe(54_000)
  })

  it('6. fixed_deduction (anticipo) reduce neto sin tocar bruto', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({ kind: 'fixed_deduction', payload: { amount: 100_000, currency: 'CLP' }, reasonCode: 'advance_payback' })
    ])

    expect(r.effectiveGrossClp).toBe(500_000)
    expect(r.siiRetentionClp).toBe(67_500)
    expect(r.fixedDeductionClp).toBe(100_000)
    expect(r.netClp).toBe(332_500)
  })

  it('7. multiple fixed_deductions se suman', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({ kind: 'fixed_deduction', payload: { amount: 50_000, currency: 'CLP' }, reasonCode: 'advance_payback' }),
      adj({ kind: 'fixed_deduction', payload: { amount: 30_000, currency: 'CLP' }, reasonCode: 'agreed_discount' })
    ])

    expect(r.fixedDeductionClp).toBe(80_000)
    expect(r.netClp).toBe(352_500)
  })

  it('8. factor + fixed_deduction componen ortogonalmente', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({ kind: 'gross_factor', payload: { factor: 0.7 } }),
      adj({ kind: 'fixed_deduction', payload: { amount: 100_000, currency: 'CLP' } })
    ])

    // bruto efectivo 350_000, sii 47_250, neto 350_000-47_250-100_000 = 202_750
    expect(r.effectiveGrossClp).toBe(350_000)
    expect(r.siiRetentionClp).toBe(47_250)
    expect(r.fixedDeductionClp).toBe(100_000)
    expect(r.netClp).toBe(202_750)
  })

  it('9. manual_override gana sobre todo', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({ kind: 'gross_factor', payload: { factor: 0.5 } }),
      adj({ kind: 'fixed_deduction', payload: { amount: 100_000, currency: 'CLP' } }),
      adj({ kind: 'manual_override', payload: { netAmount: 999_999, currency: 'CLP' } })
    ])

    expect(r.overrideApplied).toBe(true)
    expect(r.netClp).toBe(999_999)
    // Y los componentes intermedios se reportan tal cual
    expect(r.effectiveGrossClp).toBe(250_000)
    expect(r.fixedDeductionClp).toBe(100_000)
  })

  it('10. chile dependiente — recomputa deducciones sobre bruto efectivo', () => {
    const r = computePayrollEntryNet(chileDepSnap(1_000_000, 200_000), [
      adj({ kind: 'gross_factor', payload: { factor: 0.5 }, reasonCode: 'leave_unpaid' })
    ])

    expect(r.effectiveGrossClp).toBe(500_000)
    // deducciones proporcionales: 100_000
    expect(r.chileDeductionsClp).toBe(100_000)
    expect(r.siiRetentionClp).toBe(0) // no es honorarios
    expect(r.netClp).toBe(400_000)
  })

  it('11. international — sin SII ni previsional', () => {
    const r = computePayrollEntryNet(intlSnap(2_000_000), [
      adj({ kind: 'gross_factor', payload: { factor: 0.5 } })
    ])

    expect(r.effectiveGrossClp).toBe(1_000_000)
    expect(r.siiRetentionClp).toBe(0)
    expect(r.chileDeductionsClp).toBe(0)
    expect(r.netClp).toBe(1_000_000)
  })

  it('12. ignore inactive adjustments (pending_approval, reverted, superseded)', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({ kind: 'gross_factor', payload: { factor: 0.5 }, status: 'reverted' }),
      adj({ kind: 'fixed_deduction', payload: { amount: 100_000, currency: 'CLP' }, status: 'pending_approval' }),
      adj({ kind: 'manual_override', payload: { netAmount: 1, currency: 'CLP' }, status: 'superseded' })
    ])

    // ningun adj activo => natural
    expect(r.effectiveGrossClp).toBe(500_000)
    expect(r.netClp).toBe(432_500)
    expect(r.appliedAdjustmentIds).toEqual([])
  })

  it('13. idempotente — mismo input, mismo output', () => {
    const adjs = [
      adj({ kind: 'gross_factor', payload: { factor: 0.6 } }),
      adj({ kind: 'fixed_deduction', payload: { amount: 50_000, currency: 'CLP' } })
    ]

    const a = computePayrollEntryNet(honorariosSnap(500_000), adjs)
    const b = computePayrollEntryNet(honorariosSnap(500_000), adjs)

    expect(a).toEqual(b)
  })

  it('14. exclude tiene prioridad sobre cualquier otro adjustment activo', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({ kind: 'gross_factor', payload: { factor: 0.7 } }),
      adj({ kind: 'fixed_deduction', payload: { amount: 30_000, currency: 'CLP' } }),
      adj({ kind: 'exclude', payload: {}, reasonCode: 'no_activity' })
    ])

    expect(r.excluded).toBe(true)
    expect(r.netClp).toBe(0)
  })

  it('15. gross_factor_per_component override por linea', () => {
    const snap: PayrollEntryComputeSnapshot = {
      payRegime: 'international',
      contractTypeSnapshot: 'contractor',
      currency: 'USD',
      naturalGrossClp: 1_000_000,
      components: { base: 700_000, bonusOtd: 200_000, bonusRpa: 100_000 },
      siiRetentionRate: null
    }

    const r = computePayrollEntryNet(snap, [
      adj({
        kind: 'gross_factor_per_component',
        payload: { components: { base: 0.5, bonusOtd: 1, bonusRpa: 1 } }
      })
    ])

    // 700_000 * 0.5 + 200_000 * 1 + 100_000 * 1 = 650_000
    expect(r.effectiveGrossClp).toBe(650_000)
    expect(r.netClp).toBe(650_000)
  })

  it('16. negative natural gross no rompe (clamps a 0)', () => {
    const r = computePayrollEntryNet(honorariosSnap(-100), [])

    expect(r.naturalGrossClp).toBe(0)
    expect(r.netClp).toBe(0)
  })

  it('17. fixed_deduction mayor al bruto puede dejar neto negativo (caller decide)', () => {
    const r = computePayrollEntryNet(honorariosSnap(100_000), [
      adj({ kind: 'fixed_deduction', payload: { amount: 200_000, currency: 'CLP' } })
    ])

    // Por diseño no clamp; el caller (UI/blockers) deciden si permite negative.
    expect(r.netClp).toBeLessThan(0)
  })

  it('18. order independiente (orden de input no cambia resultado)', () => {
    const a1 = adj({ kind: 'fixed_deduction', payload: { amount: 30_000, currency: 'CLP' } })
    const a2 = adj({ kind: 'gross_factor', payload: { factor: 0.7 } })

    const r1 = computePayrollEntryNet(honorariosSnap(500_000), [a1, a2])
    const r2 = computePayrollEntryNet(honorariosSnap(500_000), [a2, a1])

    expect(r1.netClp).toBe(r2.netClp)
    expect(r1.effectiveGrossClp).toBe(r2.effectiveGrossClp)
  })

  it('19. appliedAdjustmentIds list refleja exactamente los activos contribuyendo', () => {
    const a1 = adj({ kind: 'gross_factor', payload: { factor: 0.5 } })
    const a2 = adj({ kind: 'fixed_deduction', payload: { amount: 50_000, currency: 'CLP' } })
    const a3 = adj({ kind: 'gross_factor', payload: { factor: 0.8 }, status: 'reverted' })
    const r = computePayrollEntryNet(honorariosSnap(500_000), [a1, a2, a3])

    expect(r.appliedAdjustmentIds).toEqual([a1.adjustmentId, a2.adjustmentId])
  })

  // ── TASK-745b — currency self-describing ──────────────────────────

  it('20. fixed_deduction USD aplica a entry USD sin tocar SII (no honorarios)', () => {
    const r = computePayrollEntryNet(intlSnap(2_000), [
      adj({
        kind: 'fixed_deduction',
        payload: { amount: 95, currency: 'USD' },
        reasonCode: 'agreed_discount'
      })
    ])

    expect(r.fixedDeductionClp).toBe(95)
    expect(r.netClp).toBe(2_000 - 95)
    expect(r.siiRetentionClp).toBe(0)
    expect(r.chileDeductionsClp).toBe(0)
  })

  it('21. fixed_deduction con currency mismatch lanza AdjustmentCurrencyMismatchError', () => {
    expect(() =>
      computePayrollEntryNet(intlSnap(2_000), [
        adj({
          kind: 'fixed_deduction',
          payload: { amount: 95, currency: 'CLP' },
          reasonCode: 'agreed_discount'
        })
      ])
    ).toThrow(/AdjustmentCurrencyMismatch|payload.currency=CLP/)
  })

  it('22. manual_override USD: usa netAmount + currency coherente', () => {
    const r = computePayrollEntryNet(intlSnap(2_000), [
      adj({
        kind: 'manual_override',
        payload: { netAmount: 1_500, currency: 'USD' },
        reasonCode: 'agreed_discount'
      })
    ])

    expect(r.overrideApplied).toBe(true)
    expect(r.netClp).toBe(1_500)
  })

  it('23. manual_override legacy `netClp` sigue funcionando back-compat para CLP', () => {
    const r = computePayrollEntryNet(honorariosSnap(500_000), [
      adj({
        kind: 'manual_override',
        payload: { netClp: 250_000, currency: 'CLP' },
        reasonCode: 'correction_prior_period'
      })
    ])

    expect(r.overrideApplied).toBe(true)
    expect(r.netClp).toBe(250_000)
  })
})
