import { describe, expect, it } from 'vitest'

import { classifyTierComplianceFromEntry } from '../tier-compliance'

describe('classifyTierComplianceFromEntry', () => {
  it('returns below_min when margin is under the tier floor', () => {
    const result = classifyTierComplianceFromEntry({
      effectiveMarginPct: 0.35,
      tier: '3',
      tierMargins: {
        tier: '3',
        tierLabel: 'Estrategico',
        marginMin: 0.4,
        marginOpt: 0.5,
        marginMax: 0.6,
        effectiveFrom: '2026-04-18',
        notes: null,
        updatedAt: '2026-04-18T00:00:00.000Z'
      }
    })

    expect(result.status).toBe('below_min')
    expect(result.marginMin).toBe(0.4)
  })

  it('returns at_optimum when margin matches optimum', () => {
    const result = classifyTierComplianceFromEntry({
      effectiveMarginPct: 0.5,
      tier: '3',
      tierMargins: {
        tier: '3',
        tierLabel: 'Estrategico',
        marginMin: 0.4,
        marginOpt: 0.5,
        marginMax: 0.6,
        effectiveFrom: '2026-04-18',
        notes: null,
        updatedAt: '2026-04-18T00:00:00.000Z'
      }
    })

    expect(result.status).toBe('at_optimum')
  })

  it('returns unknown without tier metadata', () => {
    const result = classifyTierComplianceFromEntry({
      effectiveMarginPct: 0.5,
      tier: null,
      tierMargins: null
    })

    expect(result.status).toBe('unknown')
  })
})
