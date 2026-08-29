import { describe, expect, it } from 'vitest'

import type { SeoAeoGapReady, SeoRankEvolutionReady } from '../contracts'
import { modelFromSeoReport } from '../model'

const rankEvolution: SeoRankEvolutionReady = {
  ok: true,
  seoTargetId: 'seot-demo',
  organizationId: 'org-demo',
  engine: 'google',
  device: 'desktop',
  range: { from: '2026-05-01', to: '2026-05-30', days: 30 },
  source: 'postgres',
  provenance: [
    { section: 'series[].points[].position', lens: 'estimated', source: 'dataforseo_serp', capturedAt: '2026-05-30' }
  ],
  series: [
    {
      keyword: 'software de marketing',
      points: [
        { date: '2026-05-29', position: 12, url: 'https://example.com/marketing', aiOverview: false },
        { date: '2026-05-30', position: 8, url: 'https://example.com/marketing', aiOverview: true }
      ]
    },
    {
      keyword: 'automatización comercial',
      points: [{ date: '2026-05-30', position: 18, url: 'https://example.com/automation' }]
    }
  ]
}

const gap: SeoAeoGapReady = {
  ok: true,
  organizationId: 'org-demo',
  seoTargetId: 'seot-demo',
  aeoAxisGranularity: 'domain',
  domainQuadrant: 'riesgo',
  seoLens: {
    windowDays: 28,
    keywords: [
      {
        keyword: 'software de marketing',
        page: 'https://example.com/marketing',
        position: 8,
        impressions: 1200,
        clicks: 90
      }
    ]
  },
  aeoLens: {
    latestRunId: 'run-demo',
    latestRunAt: '2026-05-30T12:00:00.000Z',
    overallScore: 42,
    cited: false,
    scoreVersion: 'grader-score-v1'
  },
  quadrants: [
    { keyword: 'software de marketing', rankPosition: 8, aeoScore: 42, quadrant: 'riesgo' },
    { keyword: 'automatización comercial', rankPosition: 18, aeoScore: 42, quadrant: 'invisible' }
  ]
}

describe('modelFromSeoReport', () => {
  it('keeps SEO rank and AEO citation as separate lenses in the shared artifact envelope', () => {
    const model = modelFromSeoReport({
      organizationName: 'Efeonce Demo',
      seoTargetId: 'seot-demo',
      asOfDate: '2026-05-30',
      rankEvolution,
      gap
    })

    expect(model.variant).toBe('clientPortal')
    expect(model.overallScore).toBeNull()
    expect(model.surface?.kind).toBe('seo')

    if (model.surface?.kind !== 'seo') throw new Error('SEO surface missing')

    expect(model.surface.seo.status).toBe('ready')
    expect(model.surface.seo.summary).toEqual({
      positionAverage: 13,
      keywordCount: 2,
      pageOneCount: 1,
      opportunityCount: 2
    })
    expect(model.surface.seo.gap?.domainQuadrant).toBe('riesgo')
    expect(JSON.stringify(model)).not.toContain('providerCostUsd')
    expect(model.engineSnapshot).toEqual([])
  })

  it('marks a report partial when only one lens has evidence', () => {
    const model = modelFromSeoReport({
      organizationName: 'Efeonce Demo',
      seoTargetId: 'seot-demo',
      asOfDate: null,
      rankEvolution,
      gap: null
    }, 'attachment')

    expect(model.variant).toBe('attachment')
    expect(model.surface?.kind).toBe('seo')

    if (model.surface?.kind !== 'seo') throw new Error('SEO surface missing')

    expect(model.surface.seo.status).toBe('partial')
    expect(model.surface.seo.gap).toBeNull()
  })
})
