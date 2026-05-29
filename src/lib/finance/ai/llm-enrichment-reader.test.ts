import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

const {
  FINANCE_TIMELINE_DEFAULT_LIMIT,
  FINANCE_TIMELINE_MAX_LIMIT,
  readClientFinanceAiLlmSummary,
  readFinanceAiLlmSummary,
  readFinanceAiLlmTimeline
} = await import('./llm-enrichment-reader')

beforeEach(() => {
  mockQuery.mockReset()
})

describe('readFinanceAiLlmTimeline (TASK-944)', () => {
  it('returns mapped FinanceNexaTimelineItem[] from current enrichments table', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        enrichment_id: 'EO-FAIE-001',
        signal_type: 'anomaly',
        metric_name: 'net_margin_pct',
        severity: 'critical',
        explanation_summary: 'Margen neto cayó 30%',
        root_cause_narrative: 'Direct costs spike',
        recommended_action: 'Revisar costos',
        processed_at: '2026-05-28T07:18:42.560Z'
      },
      {
        enrichment_id: 'EO-FAIE-002',
        signal_type: 'recommendation',
        metric_name: 'gross_margin_pct',
        severity: 'warning',
        explanation_summary: null,
        root_cause_narrative: null,
        recommended_action: 'Renegociar tarifas',
        processed_at: '2026-05-28T06:00:00.000Z'
      }
    ])

    const result = await readFinanceAiLlmTimeline(20)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: 'EO-FAIE-001',
      signalType: 'anomaly',
      metricId: 'net_margin_pct',
      severity: 'critical',
      explanation: 'Margen neto cayó 30%',
      rootCauseNarrative: 'Direct costs spike',
      recommendedAction: 'Revisar costos',
      processedAt: '2026-05-28T07:18:42.560Z'
    })
    expect(result[1].processedAt).toBe('2026-05-28T06:00:00.000Z')
    expect(result[1].explanation).toBeNull()
  })

  it('bounds limit between 1 and FINANCE_TIMELINE_MAX_LIMIT (50)', async () => {
    mockQuery.mockResolvedValue([])

    await readFinanceAiLlmTimeline(0)
    expect(mockQuery).toHaveBeenLastCalledWith(expect.any(String), [1])

    await readFinanceAiLlmTimeline(-5)
    expect(mockQuery).toHaveBeenLastCalledWith(expect.any(String), [1])

    await readFinanceAiLlmTimeline(99)
    expect(mockQuery).toHaveBeenLastCalledWith(expect.any(String), [FINANCE_TIMELINE_MAX_LIMIT])

    await readFinanceAiLlmTimeline()
    expect(mockQuery).toHaveBeenLastCalledWith(expect.any(String), [FINANCE_TIMELINE_DEFAULT_LIMIT])
  })

  it('reads from current finance_ai_signal_enrichments ORDER BY processed_at DESC (honest degradation Opción C)', async () => {
    mockQuery.mockResolvedValue([])

    await readFinanceAiLlmTimeline(10)

    const [sql] = mockQuery.mock.calls[0]

    expect(sql).toContain('greenhouse_serving.finance_ai_signal_enrichments')
    expect(sql).toContain("status = 'succeeded'")
    expect(sql).toContain('ORDER BY processed_at DESC')
    expect(sql).toContain('LIMIT $1')
    // Explicit anti-regresión: NO debe leer history table (out of scope per TASK-944 spec)
    expect(sql).not.toContain('finance_ai_signal_enrichment_history')
  })

  it('honest degradation: returns [] when query throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('PG connection refused'))

    const result = await readFinanceAiLlmTimeline()

    expect(result).toEqual([])
  })

  it('canonical limits exported: DEFAULT=20, MAX=50 (mirror Agency)', () => {
    expect(FINANCE_TIMELINE_DEFAULT_LIMIT).toBe(20)
    expect(FINANCE_TIMELINE_MAX_LIMIT).toBe(50)
  })
})

describe('readFinanceAiLlmSummary (TASK-944 extended payload)', () => {
  it('includes timeline field in payload', async () => {
    mockQuery
      .mockResolvedValueOnce([{ succeeded: '3', last_processed_at: '2026-05-28T07:00:00Z' }]) // totals
      .mockResolvedValueOnce([]) // recent
      .mockResolvedValueOnce([{ run_id: 'EO-FAIR-1', status: 'succeeded', started_at: '2026-05-28T06:00:00Z', completed_at: '2026-05-28T07:00:00Z' }]) // latest run
      .mockResolvedValueOnce([
        {
          enrichment_id: 'EO-FAIE-001',
          signal_type: 'anomaly',
          metric_name: 'net_margin_pct',
          severity: 'critical',
          explanation_summary: 'X',
          root_cause_narrative: null,
          recommended_action: null,
          processed_at: '2026-05-28T07:18:42Z'
        }
      ]) // timeline

    const result = await readFinanceAiLlmSummary(2026, 5, 5)

    expect(result.totalAnalyzed).toBe(3)
    expect(result.runStatus).toBe('succeeded')
    expect(result.timeline).toHaveLength(1)
    expect(result.timeline[0].id).toBe('EO-FAIE-001')
    expect(result.timeline[0].processedAt).toBe('2026-05-28T07:18:42Z')
  })

  it('honest degradation: timeline = [] when query throws', async () => {
    mockQuery
      .mockResolvedValueOnce([{ succeeded: '0', last_processed_at: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('PG transient')) // timeline fails

    const result = await readFinanceAiLlmSummary(2026, 5, 5)

    expect(result.timeline).toEqual([])
    // Resto del payload preserva el shape canonical
    expect(result.totalAnalyzed).toBe(0)
    expect(result.insights).toEqual([])
  })
})

describe('readClientFinanceAiLlmSummary (TASK-944 extended payload)', () => {
  it('client-scoped summary also includes timeline (portfolio-wide V1)', async () => {
    mockQuery
      .mockResolvedValueOnce([{ succeeded: '2', last_processed_at: '2026-05-28T07:00:00Z' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ run_id: 'EO-FAIR-2', status: 'partial' }])
      .mockResolvedValueOnce([
        {
          enrichment_id: 'EO-FAIE-007',
          signal_type: 'recommendation',
          metric_name: 'total_revenue_clp',
          severity: 'info',
          explanation_summary: 'Revenue dip',
          root_cause_narrative: null,
          recommended_action: 'Push reactivation',
          processed_at: '2026-05-28T05:00:00Z'
        }
      ])

    const result = await readClientFinanceAiLlmSummary('client-123', 2026, 5, 3)

    expect(result.timeline).toHaveLength(1)
    expect(result.timeline[0].id).toBe('EO-FAIE-007')
    expect(result.runStatus).toBe('partial')
  })
})
