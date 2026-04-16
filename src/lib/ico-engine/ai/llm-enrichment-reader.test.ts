import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

const { readMemberAiLlmSummary, readTopAiLlmEnrichments } = await import('./llm-enrichment-reader')

beforeEach(() => {
  mockQuery.mockReset()
})

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

describe('readMemberAiLlmSummary', () => {
  it('filters enrichments by member, period and succeeded status', async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          total: 2,
          succeeded: 2,
          failed: 0,
          avg_quality_score: 95.4,
          last_processed_at: '2026-04-15T13:10:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          enrichment_id: 'EO-AIE-10',
          signal_type: 'anomaly',
          metric_name: 'otd_pct',
          severity: 'critical',
          explanation_summary: 'Member impact',
          recommended_action: 'Actuar',
          quality_score: 99.1,
          processed_at: '2026-04-15T13:10:00.000Z'
        },
        {
          enrichment_id: 'EO-AIE-11',
          signal_type: 'recommendation',
          metric_name: 'rpa_avg',
          severity: 'warning',
          explanation_summary: 'Otra señal',
          recommended_action: null,
          quality_score: 91.2,
          processed_at: '2026-04-15T12:30:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          run_id: 'EO-AIR-1',
          status: 'partial',
          started_at: '2026-04-15T12:00:00.000Z',
          completed_at: '2026-04-15T12:06:00.000Z'
        }
      ])

    const result = await readMemberAiLlmSummary('member-123', 2026, 4, 3)

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE member_id = $1'),
      ['member-123', 2026, 4]
    )
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("AND status = 'succeeded'"),
      ['member-123', 2026, 4, 3]
    )
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('FROM greenhouse_serving.ico_ai_enrichment_runs'),
      [2026, 4]
    )

    const memberSql = mockQuery.mock.calls[1][0] as string

    expect(memberSql).toContain("CASE COALESCE(severity, '')")
    expect(memberSql).toContain("WHEN 'critical' THEN 0")
    expect(memberSql).toContain('quality_score DESC NULLS LAST')
    expect(memberSql).toContain('processed_at DESC')

    expect(result).toEqual({
      totalAnalyzed: 2,
      lastAnalysis: '2026-04-15T13:10:00.000Z',
      runStatus: 'partial',
      insights: [
        {
          id: 'EO-AIE-10',
          signalType: 'anomaly',
          metricId: 'otd_pct',
          severity: 'critical',
          explanation: 'Member impact',
          recommendedAction: 'Actuar'
        },
        {
          id: 'EO-AIE-11',
          signalType: 'recommendation',
          metricId: 'rpa_avg',
          severity: 'warning',
          explanation: 'Otra señal',
          recommendedAction: null
        }
      ]
    })
  })
})
