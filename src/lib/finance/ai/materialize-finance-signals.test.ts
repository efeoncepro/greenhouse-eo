import { beforeEach, describe, expect, it, vi } from 'vitest'

// TASK-1201 — el materializer escribe provenance honesta del anomaly step.

const mockQuery = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockDetect = vi.fn()
const mockCapture = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCapture(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('./anomaly-detector', () => ({
  detectFinanceAnomalies: (...args: unknown[]) => mockDetect(...args)
}))

import { materializeFinanceSignals } from './materialize-finance-signals'

const findProvenanceCall = () =>
  mockQuery.mock.calls.find(
    call => typeof call[0] === 'string' && call[0].includes('finance_ai_materialization_runs')
  )

describe('materializeFinanceSignals — provenance run-truth (TASK-1201)', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockPublishOutboxEvent.mockReset()
    mockDetect.mockReset()
    mockCapture.mockReset()
    mockQuery.mockResolvedValue([])
    mockPublishOutboxEvent.mockResolvedValue(undefined)
  })

  it('economics vacío (snapshots=0) → status skipped_no_eligible_data', async () => {
    mockQuery.mockResolvedValueOnce([]) // loadClientEconomicsWindow → 0 rows
    mockDetect.mockReturnValue([])

    const result = await materializeFinanceSignals({ periodYear: 2026, periodMonth: 6, triggerType: 'test' })

    expect(result.status).toBe('skipped_no_eligible_data')
    expect(result.snapshotsEvaluated).toBe(0)
    expect(result.signalsWritten).toBe(0)

    const provenance = findProvenanceCall()

    expect(provenance).toBeDefined()
    expect(provenance?.[1]).toContain('skipped_no_eligible_data')
  })

  it('economics presente + 0 anomalías → status empty_positive', async () => {
    // loadClientEconomicsWindow → 1 row del período corriente.
    mockQuery.mockResolvedValueOnce([
      {
        client_id: 'C1',
        organization_id: 'O1',
        period_year: 2026,
        period_month: 6,
        total_revenue_clp: '1000000',
        direct_costs_clp: '400000',
        indirect_costs_clp: '100000',
        gross_margin_clp: '600000',
        gross_margin_percent: '0.6',
        net_margin_clp: '500000',
        net_margin_percent: '0.5'
      }
    ])
    mockDetect.mockReturnValue([]) // sin anomalías

    const result = await materializeFinanceSignals({ periodYear: 2026, periodMonth: 6, triggerType: 'test' })

    expect(result.status).toBe('empty_positive')
    expect(result.snapshotsEvaluated).toBe(1)
    expect(result.signalsWritten).toBe(0)

    const provenance = findProvenanceCall()

    expect(provenance?.[1]).toContain('empty_positive')
  })
})
