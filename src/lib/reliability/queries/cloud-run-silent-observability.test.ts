import { describe, it, expect, vi, beforeEach } from 'vitest'

const { queryMock, captureWithDomainMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  captureWithDomainMock: vi.fn()
}))

vi.mock('@/lib/db', () => ({ query: queryMock }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: captureWithDomainMock }))

import {
  countCloudRunSilentObservabilityFailures,
  getCloudRunSilentObservabilitySignal,
  CLOUD_RUN_SILENT_OBSERVABILITY_SIGNAL_ID
} from './cloud-run-silent-observability'

describe('cloud-run-silent-observability (TASK-844 Slice 5)', () => {
  beforeEach(() => {
    queryMock.mockReset()
    captureWithDomainMock.mockReset()
  })

  describe('countCloudRunSilentObservabilityFailures', () => {
    it('returns 0 when no Sentry-related errors in window', async () => {
      queryMock.mockResolvedValueOnce([{ n: 0 }])

      const count = await countCloudRunSilentObservabilityFailures()

      expect(count).toBe(0)
      expect(queryMock).toHaveBeenCalledTimes(1)
      expect(queryMock.mock.calls[0]?.[1]).toEqual(['24'])
    })

    it('counts rows when Sentry init errors exist', async () => {
      queryMock.mockResolvedValueOnce([{ n: 7 }])

      const count = await countCloudRunSilentObservabilityFailures()

      expect(count).toBe(7)
    })

    it('respects custom window hours', async () => {
      queryMock.mockResolvedValueOnce([{ n: 2 }])

      await countCloudRunSilentObservabilityFailures(12)

      expect(queryMock.mock.calls[0]?.[1]).toEqual(['12'])
    })

    it('SQL pattern includes all 4 anti-regression patterns (Sentry-related errors)', async () => {
      queryMock.mockResolvedValueOnce([{ n: 0 }])

      await countCloudRunSilentObservabilityFailures()

      const sql = queryMock.mock.calls[0]?.[0] ?? ''

      expect(sql).toMatch(/captureException is not a function/)
      expect(sql).toMatch(/captureMessage is not a function/)
      expect(sql).toMatch(/Sentry%not initialized/)
      expect(sql).toMatch(/@sentry\/nextjs/)
    })
  })

  describe('getCloudRunSilentObservabilitySignal', () => {
    it('returns ok severity when count = 0', async () => {
      queryMock.mockResolvedValueOnce([{ n: 0 }])

      const signal = await getCloudRunSilentObservabilitySignal()

      expect(signal.signalId).toBe(CLOUD_RUN_SILENT_OBSERVABILITY_SIGNAL_ID)
      expect(signal.moduleKey).toBe('cloud')
      expect(signal.kind).toBe('drift')
      expect(signal.severity).toBe('ok')
      expect(signal.summary).toMatch(/Sin fallas Sentry/)
    })

    it('returns error severity when count > 0', async () => {
      queryMock.mockResolvedValueOnce([{ n: 3 }])

      const signal = await getCloudRunSilentObservabilitySignal()

      expect(signal.severity).toBe('error')
      expect(signal.summary).toMatch(/3 reactive consumer runs con error de Sentry init/)
    })

    it('uses singular form when count = 1', async () => {
      queryMock.mockResolvedValueOnce([{ n: 1 }])

      const signal = await getCloudRunSilentObservabilitySignal()

      expect(signal.summary).toMatch(/1 reactive consumer run con error/)
      expect(signal.summary).not.toMatch(/runs/)
    })

    it('returns unknown severity + captureWithDomain on query failure', async () => {
      queryMock.mockRejectedValueOnce(new Error('connection refused'))

      const signal = await getCloudRunSilentObservabilitySignal()

      expect(signal.severity).toBe('unknown')
      expect(signal.summary).toMatch(/Detector falló/)
      expect(captureWithDomainMock).toHaveBeenCalledTimes(1)
      expect(captureWithDomainMock).toHaveBeenCalledWith(
        expect.any(Error),
        'cloud',
        expect.objectContaining({
          tags: expect.objectContaining({ source: 'reliability_signal_cloud_run_silent_observability' })
        })
      )
    })

    it('attaches evidence references (spec + issue + SQL pattern)', async () => {
      queryMock.mockResolvedValueOnce([{ n: 0 }])

      const signal = await getCloudRunSilentObservabilitySignal()

      const evidenceLabels = (signal.evidence ?? []).map(e => e.label)

      expect(evidenceLabels).toContain('Detector')
      expect(evidenceLabels).toContain('count')
      expect(evidenceLabels).toContain('window_hours')
      expect(evidenceLabels).toContain('Spec')
      expect(evidenceLabels).toContain('Issue')
    })
  })
})
