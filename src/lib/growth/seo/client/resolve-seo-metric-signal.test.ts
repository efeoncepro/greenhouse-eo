import { describe, expect, it } from 'vitest'

import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'

import {
  resolveCoverageTone,
  resolveOpportunityTone,
  resolvePositionTone,
  resolveSeoLeadTitle
} from './resolve-seo-metric-signal'

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

  describe('resolveSeoLeadTitle', () => {
    // Regresión del defecto que la captura del 2026-08-12 mostró en el informe web:
    // el veredicto decía "Aún no hay una posición media para leer" con "#13.3" impreso
    // al lado, porque cada render derivaba su propio título.
    it('names the measured position instead of announcing absence', () => {
      const title = resolveSeoLeadTitle(13.3)

      expect(title).toContain('13.3')
      expect(title).not.toBe(GH_GROWTH_SEO_CLIENT.summary.leadTitle)
    })

    it('falls back to the honest empty verdict only when there is no measurement', () => {
      expect(resolveSeoLeadTitle(null)).toBe(GH_GROWTH_SEO_CLIENT.summary.leadTitle)
    })

    it('keeps one decimal so the verdict matches the metric it sits next to', () => {
      expect(resolveSeoLeadTitle(3)).toContain('3.0')
    })
  })
})
