import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  query: mocks.query
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

import {
  getNotionMetricsWritebackDeadLetterDemoSignal,
  getNotionMetricsWritebackLagDemoSignal,
  WRITEBACK_DEAD_LETTER_DEMO_SIGNAL_ID,
  WRITEBACK_LAG_DEMO_SIGNAL_ID
} from './notion-metrics-demo-signals'

beforeEach(() => {
  mocks.query.mockReset()
  mocks.captureWithDomain.mockReset()
})

describe('TASK-913 Slice 3 — writeback demo signals canonical', () => {
  describe('writeback_dead_letter_demo (real signal post-Slice 2)', () => {
    it('severity=ok cuando count=0 (steady state)', async () => {
      mocks.query.mockResolvedValueOnce([{ count: '0', latest_error: null }])

      const signal = await getNotionMetricsWritebackDeadLetterDemoSignal()

      expect(signal.signalId).toBe(WRITEBACK_DEAD_LETTER_DEMO_SIGNAL_ID)
      expect(signal.severity).toBe('ok')
      expect(signal.kind).toBe('drift')
      expect(signal.moduleKey).toBe('delivery')
      expect(signal.summary).toContain('Steady state')
    })

    it('severity=error cuando count > 0', async () => {
      mocks.query.mockResolvedValueOnce([
        { count: '3', latest_error: 'Notion API PATCH 401: unauthorized' }
      ])

      const signal = await getNotionMetricsWritebackDeadLetterDemoSignal()

      expect(signal.severity).toBe('error')
      expect(signal.summary).toContain('3 snapshots en dead-letter')
      const evidenceLabels = signal.evidence?.map(e => e.label) ?? []

      expect(evidenceLabels).toContain('dead_letter_count')
      expect(evidenceLabels).toContain('latest_error')
    })

    it('severity=unknown cuando query falla (degraded honest)', async () => {
      mocks.query.mockRejectedValueOnce(new Error('PG connection lost'))

      const signal = await getNotionMetricsWritebackDeadLetterDemoSignal()

      expect(signal.severity).toBe('unknown')
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          tags: { source: 'reliability_signal_writeback_dead_letter_demo' }
        })
      )
    })

    it('SQL query filtra por threshold 4 attempts + last_error not null + not written', async () => {
      mocks.query.mockResolvedValueOnce([{ count: '0', latest_error: null }])

      await getNotionMetricsWritebackDeadLetterDemoSignal()

      const callArgs = mocks.query.mock.calls[0]
      const sql = callArgs[0] as string

      expect(sql).toContain('greenhouse_delivery.task_rpa_demo_snapshots')
      expect(sql).toContain('notion_writeback_attempt_count >=')
      expect(sql).toContain('notion_writeback_last_error IS NOT NULL')
      expect(sql).toContain('written_to_notion_at IS NULL')
      expect(callArgs[1]).toEqual([4])
    })
  })

  describe('writeback_lag_demo (new signal)', () => {
    it('severity=ok cuando count=0 (steady state)', async () => {
      mocks.query.mockResolvedValueOnce([{ count: '0', oldest_age_minutes: null }])

      const signal = await getNotionMetricsWritebackLagDemoSignal()

      expect(signal.signalId).toBe(WRITEBACK_LAG_DEMO_SIGNAL_ID)
      expect(signal.severity).toBe('ok')
      expect(signal.kind).toBe('lag')
      expect(signal.moduleKey).toBe('delivery')
    })

    it('severity=warning cuando 1-3 snapshots con lag', async () => {
      mocks.query.mockResolvedValueOnce([{ count: '2', oldest_age_minutes: '45.5' }])

      const signal = await getNotionMetricsWritebackLagDemoSignal()

      expect(signal.severity).toBe('warning')
      expect(signal.summary).toContain('2 snapshots pending')
      expect(signal.summary).toContain('oldest=46min')
    })

    it('severity=error cuando > 3 snapshots con lag', async () => {
      mocks.query.mockResolvedValueOnce([{ count: '10', oldest_age_minutes: '120' }])

      const signal = await getNotionMetricsWritebackLagDemoSignal()

      expect(signal.severity).toBe('error')
      expect(signal.summary).toContain('10 snapshots')
    })

    it('SQL filtra por rpa_value NOT NULL + dataStatus=valid + < dead-letter threshold + > 30min', async () => {
      mocks.query.mockResolvedValueOnce([{ count: '0', oldest_age_minutes: null }])

      await getNotionMetricsWritebackLagDemoSignal()

      const callArgs = mocks.query.mock.calls[0]
      const sql = callArgs[0] as string

      expect(sql).toContain("rpa_data_status = 'valid'")
      expect(sql).toContain('rpa_value IS NOT NULL')
      expect(sql).toContain('written_to_notion_at IS NULL')
      expect(sql).toContain('notion_writeback_attempt_count <')
      expect(sql).toContain("INTERVAL '30 minutes'")
      // Uses EXTRACT EPOCH from NOW() - computed_at (TIMESTAMPTZ subtraction, safe)
      expect(sql).toContain('EXTRACT(EPOCH FROM (NOW() - computed_at))')
    })

    it('severity=unknown cuando query falla', async () => {
      mocks.query.mockRejectedValueOnce(new Error('PG error'))

      const signal = await getNotionMetricsWritebackLagDemoSignal()

      expect(signal.severity).toBe('unknown')
      expect(mocks.captureWithDomain).toHaveBeenCalledWith(
        expect.any(Error),
        'integrations.notion',
        expect.objectContaining({
          tags: { source: 'reliability_signal_writeback_lag_demo' }
        })
      )
    })
  })
})
