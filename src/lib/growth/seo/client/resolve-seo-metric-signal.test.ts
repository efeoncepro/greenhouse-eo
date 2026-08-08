import { describe, expect, it } from 'vitest'

import { resolveCoverageTone, resolveOpportunityTone, resolvePositionTone } from './resolve-seo-metric-signal'

describe('resolve SEO metric signals', () => {
  it('classifies position by page-one and deeper-rank thresholds', () => {
    expect(resolvePositionTone(null)).toBe('default')
    expect(resolvePositionTone(10)).toBe('success')
    expect(resolvePositionTone(20)).toBe('warning')
    expect(resolvePositionTone(20.1)).toBe('error')
  })

  it('classifies coverage without fabricating a state for an empty base', () => {
    expect(resolveCoverageTone(0, 0)).toBe('default')
    expect(resolveCoverageTone(19, 31)).toBe('success')
    expect(resolveCoverageTone(10, 31)).toBe('warning')
    expect(resolveCoverageTone(3, 31)).toBe('error')
  })

  it('uses attention when opportunities exist and calm when none remain', () => {
    expect(resolveOpportunityTone(null)).toBe('default')
    expect(resolveOpportunityTone(2)).toBe('warning')
    expect(resolveOpportunityTone(0)).toBe('success')
  })
})
