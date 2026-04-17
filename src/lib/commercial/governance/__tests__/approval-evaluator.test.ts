import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

import { evaluateApproval } from '../approval-evaluator'

const policyRow = (overrides: Record<string, unknown> = {}) => ({
  policy_id: 'ap-1',
  policy_name: 'Test policy',
  business_line_code: null,
  pricing_model: null,
  condition_type: 'margin_below_floor',
  threshold_value: null,
  required_role: 'finance',
  step_order: 1,
  active: true,
  created_by: 'seed',
  created_at: '2026-04-17T00:00:00Z',
  updated_at: '2026-04-17T00:00:00Z',
  ...overrides
})

beforeEach(() => {
  mockQuery.mockReset()
})

describe('evaluateApproval', () => {
  it('emits a step when margin is below floor', async () => {
    mockQuery.mockResolvedValueOnce([policyRow({ condition_type: 'margin_below_floor' })])

    const steps = await evaluateApproval({
      businessLineCode: 'EO-BL-WAVE',
      pricingModel: 'retainer',
      quotationMarginPct: 18,
      marginTargetPct: 28,
      marginFloorPct: 20,
      totalPrice: 5_000_000,
      discountPct: 0
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      policyId: 'ap-1',
      requiredRole: 'finance',
      stepOrder: 1
    })
    expect(steps[0].conditionLabel).toMatch(/Margen 18\.00% bajo el piso 20\.00%/)
  })

  it('does not emit a step when margin is at/above floor', async () => {
    mockQuery.mockResolvedValueOnce([policyRow({ condition_type: 'margin_below_floor' })])

    const steps = await evaluateApproval({
      businessLineCode: null,
      pricingModel: null,
      quotationMarginPct: 25,
      marginTargetPct: 25,
      marginFloorPct: 20,
      totalPrice: 5_000_000,
      discountPct: 0
    })

    expect(steps).toEqual([])
  })

  it('triggers amount_above_threshold when total exceeds threshold', async () => {
    mockQuery.mockResolvedValueOnce([
      policyRow({
        policy_id: 'ap-amount',
        condition_type: 'amount_above_threshold',
        threshold_value: 50_000_000,
        required_role: 'efeonce_admin',
        step_order: 2
      })
    ])

    const steps = await evaluateApproval({
      businessLineCode: null,
      pricingModel: null,
      quotationMarginPct: 35,
      marginTargetPct: 25,
      marginFloorPct: 15,
      totalPrice: 80_000_000,
      discountPct: 5
    })

    expect(steps).toHaveLength(1)
    expect(steps[0].requiredRole).toBe('efeonce_admin')
    expect(steps[0].conditionLabel).toMatch(/supera umbral/)
  })

  it('triggers discount_above_threshold when discount percent exceeds threshold', async () => {
    mockQuery.mockResolvedValueOnce([
      policyRow({
        condition_type: 'discount_above_threshold',
        threshold_value: 30
      })
    ])

    const steps = await evaluateApproval({
      businessLineCode: null,
      pricingModel: null,
      quotationMarginPct: 30,
      marginTargetPct: 25,
      marginFloorPct: 15,
      totalPrice: 1_000_000,
      discountPct: 42
    })

    expect(steps).toHaveLength(1)
    expect(steps[0].conditionLabel).toMatch(/Descuento 42\.00%/)
  })

  it('always policies emit regardless of health numbers', async () => {
    mockQuery.mockResolvedValueOnce([
      policyRow({ condition_type: 'always', policy_name: 'Compliance review', required_role: 'efeonce_admin' })
    ])

    const steps = await evaluateApproval({
      businessLineCode: null,
      pricingModel: null,
      quotationMarginPct: 99,
      marginTargetPct: 20,
      marginFloorPct: 10,
      totalPrice: 1000,
      discountPct: 0
    })

    expect(steps).toHaveLength(1)
    expect(steps[0].conditionLabel).toBe('Compliance review')
  })

  it('skips policies whose BL or pricing model does not match the input', async () => {
    mockQuery.mockResolvedValueOnce([
      policyRow({ business_line_code: 'EO-BL-GLOBE', condition_type: 'always' })
    ])

    const steps = await evaluateApproval({
      businessLineCode: 'EO-BL-REACH',
      pricingModel: 'retainer',
      quotationMarginPct: 10,
      marginTargetPct: 25,
      marginFloorPct: 15,
      totalPrice: 1000,
      discountPct: 0
    })

    expect(steps).toEqual([])
  })

  it('returns multiple ordered steps when several policies match', async () => {
    mockQuery.mockResolvedValueOnce([
      policyRow({ policy_id: 'ap-floor', condition_type: 'margin_below_floor', step_order: 1 }),
      policyRow({
        policy_id: 'ap-amount',
        condition_type: 'amount_above_threshold',
        threshold_value: 10_000_000,
        required_role: 'efeonce_admin',
        step_order: 2
      })
    ])

    const steps = await evaluateApproval({
      businessLineCode: null,
      pricingModel: null,
      quotationMarginPct: 10,
      marginTargetPct: 25,
      marginFloorPct: 15,
      totalPrice: 30_000_000,
      discountPct: 0
    })

    expect(steps.map(s => s.policyId)).toEqual(['ap-floor', 'ap-amount'])
    expect(steps.map(s => s.requiredRole)).toEqual(['finance', 'efeonce_admin'])
  })
})
