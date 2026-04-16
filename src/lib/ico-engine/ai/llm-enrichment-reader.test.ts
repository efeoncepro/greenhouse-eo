import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

const { readTopAiLlmEnrichments } = await import('./llm-enrichment-reader')

describe('readTopAiLlmEnrichments', () => {
  it('orders enrichments by severity, quality score and processed time', async () => {
    mockQuery.mockResolvedValue([
      {
        enrichment_id: 'EO-AIE-1',
        signal_id: 'signal-1',
        space_id: 'space-1',
        metric_name: 'otd_pct',
        signal_type: 'anomaly',
        severity: 'critical',
        quality_score: 97.5,
        explanation_summary: 'Crítica',
        recommended_action: 'Actuar',
        confidence: 0.93,
        processed_at: '2026-04-15T13:10:00.000Z'
      },
      {
        enrichment_id: 'EO-AIE-2',
        signal_id: 'signal-2',
        space_id: 'space-2',
        metric_name: 'rpa_avg',
        signal_type: 'prediction',
        severity: 'warning',
        quality_score: 92.1,
        explanation_summary: 'Warning',
        recommended_action: 'Revisar',
        confidence: 0.88,
        processed_at: '2026-04-15T13:05:00.000Z'
      }
    ])

    const result = await readTopAiLlmEnrichments(2026, 4, 3)

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("CASE COALESCE(severity, '')"),
      [2026, 4, 3]
    )

    const sql = mockQuery.mock.calls[0][0] as string

    expect(sql).toContain("WHEN 'critical' THEN 0")
    expect(sql).toContain("WHEN 'warning' THEN 1")
    expect(sql).toContain("WHEN 'info' THEN 2")
    expect(sql).toContain("AND status = 'succeeded'")
    expect(sql).toContain('quality_score DESC NULLS LAST')
    expect(sql).toContain('processed_at DESC')

    expect(result).toEqual([
      {
        enrichmentId: 'EO-AIE-1',
        signalId: 'signal-1',
        spaceId: 'space-1',
        metricName: 'otd_pct',
        signalType: 'anomaly',
        severity: 'critical',
        qualityScore: 97.5,
        explanationSummary: 'Crítica',
        recommendedAction: 'Actuar',
        confidence: 0.93,
        processedAt: '2026-04-15T13:10:00.000Z'
      },
      {
        enrichmentId: 'EO-AIE-2',
        signalId: 'signal-2',
        spaceId: 'space-2',
        metricName: 'rpa_avg',
        signalType: 'prediction',
        severity: 'warning',
        qualityScore: 92.1,
        explanationSummary: 'Warning',
        recommendedAction: 'Revisar',
        confidence: 0.88,
        processedAt: '2026-04-15T13:05:00.000Z'
      }
    ])
  })
})
