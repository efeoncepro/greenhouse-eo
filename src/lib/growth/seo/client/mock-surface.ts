import type { SeoClientSurfaceRead } from './read-seo-client-surface'

/**
 * TASK-1310 — deterministic visual QA fixture.
 *
 * This is consumed only by the authenticated `/mockup` routes. It mirrors the reader DTOs
 * exactly so GVC can exercise the populated visual family without mutating a tenant or
 * pretending that staging has an SEO assignment.
 */
export const SEO_CLIENT_MOCK_SURFACE: SeoClientSurfaceRead = {
  organizationId: 'org-task-1310-visual-qa',
  seoTargetId: 'seot-task-1310-visual-qa',
  connection: { state: 'connected', dataAsOf: '2026-08-07' },
  rankReaderFailed: false,
  gapReaderFailed: false,
  rankEvolution: {
    ok: true,
    seoTargetId: 'seot-task-1310-visual-qa',
    organizationId: 'org-task-1310-visual-qa',
    engine: 'google',
    device: 'desktop',
    range: { from: '2026-07-09', to: '2026-08-07', days: 30 },
    source: 'postgres',
    series: [
      {
        keyword: 'agencia de marketing',
        points: [
          { date: '2026-07-09', position: 6, url: 'https://example.com/agencia', aiOverview: false },
          { date: '2026-07-16', position: 5, url: 'https://example.com/agencia', aiOverview: false },
          { date: '2026-07-23', position: 4, url: 'https://example.com/agencia', aiOverview: true },
          { date: '2026-07-30', position: 4, url: 'https://example.com/agencia', aiOverview: true },
          { date: '2026-08-07', position: 3, url: 'https://example.com/agencia', aiOverview: true }
        ]
      },
      {
        keyword: 'seo para empresas',
        points: [
          { date: '2026-07-09', position: 12, url: 'https://example.com/seo', aiOverview: false },
          { date: '2026-07-16', position: 11, url: 'https://example.com/seo', aiOverview: false },
          { date: '2026-07-23', position: 13, url: 'https://example.com/seo', aiOverview: false },
          { date: '2026-07-30', position: 10, url: 'https://example.com/seo', aiOverview: false },
          { date: '2026-08-07', position: 9, url: 'https://example.com/seo', aiOverview: true }
        ]
      },
      {
        keyword: 'consultoría digital',
        points: [
          { date: '2026-07-09', position: 20, url: 'https://example.com/consultoria', aiOverview: false },
          { date: '2026-07-16', position: null, url: null, aiOverview: false },
          { date: '2026-07-23', position: 19, url: 'https://example.com/consultoria', aiOverview: false },
          { date: '2026-07-30', position: 18, url: 'https://example.com/consultoria', aiOverview: true },
          { date: '2026-08-07', position: 17, url: 'https://example.com/consultoria', aiOverview: true }
        ]
      },
      {
        keyword: 'estrategia de crecimiento',
        points: [
          { date: '2026-07-09', position: 28, url: 'https://example.com/estrategia', aiOverview: false },
          { date: '2026-07-16', position: 26, url: 'https://example.com/estrategia', aiOverview: false },
          { date: '2026-07-23', position: null, url: null, aiOverview: false },
          { date: '2026-07-30', position: 25, url: 'https://example.com/estrategia', aiOverview: false },
          { date: '2026-08-07', position: 24, url: 'https://example.com/estrategia', aiOverview: false }
        ]
      }
    ]
  },
  gap: {
    ok: true,
    organizationId: 'org-task-1310-visual-qa',
    seoTargetId: 'seot-task-1310-visual-qa',
    aeoAxisGranularity: 'domain',
    seoLens: {
      windowDays: 28,
      keywords: [
        { keyword: 'agencia de marketing', page: 'https://example.com/agencia', position: 3, impressions: 4200, clicks: 480 },
        { keyword: 'seo para empresas', page: 'https://example.com/seo', position: 9, impressions: 2800, clicks: 190 },
        { keyword: 'consultoría digital', page: 'https://example.com/consultoria', position: 17, impressions: 1600, clicks: 72 },
        { keyword: 'estrategia de crecimiento', page: 'https://example.com/estrategia', position: 24, impressions: 900, clicks: 28 }
      ]
    },
    aeoLens: {
      latestRunId: 'run-task-1310-visual-qa',
      latestRunAt: '2026-08-07T12:00:00.000Z',
      overallScore: 42,
      cited: false
    },
    domainQuadrant: 'riesgo',
    quadrants: [
      { keyword: 'agencia de marketing', rankPosition: 3, aeoScore: 42, quadrant: 'riesgo' },
      { keyword: 'seo para empresas', rankPosition: 9, aeoScore: 42, quadrant: 'riesgo' },
      { keyword: 'consultoría digital', rankPosition: 17, aeoScore: 42, quadrant: 'invisible' },
      { keyword: 'estrategia de crecimiento', rankPosition: 24, aeoScore: 42, quadrant: 'invisible' }
    ]
  }
}
