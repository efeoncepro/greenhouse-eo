import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── TASK-947 — Anti-regresión drillHref canonical en Home Nexa Insights ────

vi.mock('server-only', () => ({}))

const mockReadTopAiLlmEnrichments = vi.fn()
const mockReadAgencyAiLlmSummary = vi.fn()

vi.mock('@/lib/ico-engine/ai/llm-enrichment-reader', () => ({
  readTopAiLlmEnrichments: (...args: unknown[]) => mockReadTopAiLlmEnrichments(...args),
  readAgencyAiLlmSummary: (...args: unknown[]) => mockReadAgencyAiLlmSummary(...args)
}))

const { loadHomeAiInsightsBento } = await import('./load-ai-insights-bento')

const summaryFixture = {
  totals: { total: 1, succeeded: 1, failed: 0, avgQualityScore: 90 },
  latestRun: null,
  recentEnrichments: [],
  timeline: [],
  lastProcessedAt: '2026-05-28T12:00:00.000Z',
  dataStatus: 'ready' as const
}

beforeEach(() => {
  mockReadTopAiLlmEnrichments.mockReset()
  mockReadAgencyAiLlmSummary.mockReset()
  mockReadAgencyAiLlmSummary.mockResolvedValue(summaryFixture)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('loadHomeAiInsightsBento — drillHref canonical (TASK-947)', () => {
  it('emite drillHref top-level /nexa/insights/<signalId> (NO /agency/insights/*)', async () => {
    mockReadTopAiLlmEnrichments.mockResolvedValue([
      {
        enrichmentId: 'EO-AIE-12345678',
        signalId: 'EO-AIS-deadbeefcafe',
        spaceId: 'spc-efeonce',
        metricName: 'ftr_pct',
        signalType: 'anomaly',
        severity: 'warning',
        qualityScore: 92.4,
        explanationSummary: 'FTR cayó 8%',
        rootCauseNarrative: null,
        recommendedAction: null,
        confidence: 0.88,
        processedAt: '2026-05-28T12:00:00.000Z'
      }
    ])

    const result = await loadHomeAiInsightsBento()

    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].drillHref).toBe('/nexa/insights/EO-AIS-deadbeefcafe')
    expect(result.cards[0].drillHref).not.toMatch(/\/agency\//)
  })

  it('drillHref usa signalId (NO enrichmentId) — share semantics TASK-947', async () => {
    mockReadTopAiLlmEnrichments.mockResolvedValue([
      {
        enrichmentId: 'EO-AIE-aaaaaaaa',
        signalId: 'EO-AIS-bbbbbbbbbbbb',
        spaceId: 'spc-sky',
        metricName: 'otd_pct',
        signalType: 'recommendation',
        severity: 'critical',
        qualityScore: 95,
        explanationSummary: null,
        rootCauseNarrative: null,
        recommendedAction: 'Reasignar',
        confidence: 0.91,
        processedAt: '2026-05-28T11:00:00.000Z'
      }
    ])

    const result = await loadHomeAiInsightsBento()

    expect(result.cards[0].drillHref).toContain('EO-AIS-')
    expect(result.cards[0].drillHref).not.toContain('EO-AIE-')
  })
})
