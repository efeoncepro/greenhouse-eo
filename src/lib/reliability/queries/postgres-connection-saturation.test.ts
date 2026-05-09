import { describe, it, expect, vi, beforeEach } from 'vitest'

const { queryMock, captureWithDomainMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  captureWithDomainMock: vi.fn()
}))

vi.mock('@/lib/db', () => ({ query: queryMock }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: captureWithDomainMock }))

import {
  getPostgresConnectionSaturationSnapshot,
  getPostgresConnectionSaturationSignal,
  POSTGRES_CONNECTION_SATURATION_SIGNAL_ID
} from './postgres-connection-saturation'

const buildRow = (overrides: Partial<Record<string, number | string>> = {}) => ({
  max_conn: 100,
  reserved: 3,
  usable_max: 97,
  total: 30,
  active: 5,
  idle: 25,
  idle_in_tx: 0,
  app_conns: 28,
  ops_conns: 2,
  max_idle_seconds: 120,
  usage_pct: 30.9,
  ...overrides
})

describe('postgres-connection-saturation (TASK-846 Slice 6)', () => {
  beforeEach(() => {
    queryMock.mockReset()
    captureWithDomainMock.mockReset()
  })

  describe('getPostgresConnectionSaturationSnapshot', () => {
    it('parses pg_stat_activity row into typed snapshot', async () => {
      queryMock.mockResolvedValueOnce([buildRow()])

      const snapshot = await getPostgresConnectionSaturationSnapshot()

      expect(snapshot).toEqual({
        maxConn: 100,
        reserved: 3,
        usableMax: 97,
        total: 30,
        active: 5,
        idle: 25,
        idleInTx: 0,
        appConns: 28,
        opsConns: 2,
        maxIdleSeconds: 120,
        usagePct: 30.9
      })
    })

    it('throws when query returns empty result', async () => {
      queryMock.mockResolvedValueOnce([])

      await expect(getPostgresConnectionSaturationSnapshot()).rejects.toThrow(
        /empty result from pg_stat_activity/
      )
    })

    it('coerces string usage_pct (BigQuery-like JSON serialization)', async () => {
      queryMock.mockResolvedValueOnce([buildRow({ usage_pct: '45.2' })])

      const snapshot = await getPostgresConnectionSaturationSnapshot()

      expect(snapshot.usagePct).toBe(45.2)
    })
  })

  describe('getPostgresConnectionSaturationSignal severity thresholds', () => {
    it('returns ok severity when usage < 60%', async () => {
      queryMock.mockResolvedValueOnce([buildRow({ usage_pct: 35, total: 34 })])

      const signal = await getPostgresConnectionSaturationSignal()

      expect(signal.signalId).toBe(POSTGRES_CONNECTION_SATURATION_SIGNAL_ID)
      expect(signal.moduleKey).toBe('cloud')
      expect(signal.kind).toBe('runtime')
      expect(signal.severity).toBe('ok')
      expect(signal.summary).toMatch(/Saturación OK/)
    })

    it('returns warning severity when usage 60-79%', async () => {
      queryMock.mockResolvedValueOnce([buildRow({ usage_pct: 65, total: 63 })])

      const signal = await getPostgresConnectionSaturationSignal()

      expect(signal.severity).toBe('warning')
      expect(signal.summary).toMatch(/Saturación elevada/)
      expect(signal.summary).toMatch(/V2 deployment/)
    })

    it('returns error severity when usage >= 80%', async () => {
      queryMock.mockResolvedValueOnce([buildRow({ usage_pct: 85, total: 82 })])

      const signal = await getPostgresConnectionSaturationSignal()

      expect(signal.severity).toBe('error')
      expect(signal.summary).toMatch(/Saturación crítica/)
      expect(signal.summary).toMatch(/TASK-847/)
    })

    it('boundary: usage exactly 60% → warning', async () => {
      queryMock.mockResolvedValueOnce([buildRow({ usage_pct: 60, total: 58 })])

      const signal = await getPostgresConnectionSaturationSignal()

      expect(signal.severity).toBe('warning')
    })

    it('boundary: usage exactly 80% → error', async () => {
      queryMock.mockResolvedValueOnce([buildRow({ usage_pct: 80, total: 78 })])

      const signal = await getPostgresConnectionSaturationSignal()

      expect(signal.severity).toBe('error')
    })

    it('boundary: usage 59.9% → ok', async () => {
      queryMock.mockResolvedValueOnce([buildRow({ usage_pct: 59.9 })])

      const signal = await getPostgresConnectionSaturationSignal()

      expect(signal.severity).toBe('ok')
    })
  })

  describe('idle leak detection inside ok bucket', () => {
    it('warns about idle leak even when usage < 60% if idle conns >= 30 and max_idle > 600s', async () => {
      queryMock.mockResolvedValueOnce([
        buildRow({ usage_pct: 40, total: 39, idle: 35, max_idle_seconds: 700 })
      ])

      const signal = await getPostgresConnectionSaturationSignal()

      expect(signal.severity).toBe('ok')
      expect(signal.summary).toMatch(/35 idle conns/)
      expect(signal.summary).toMatch(/ALTER ROLE idle_session_timeout/)
    })

    it('does NOT warn when idle is high but max_idle is recent', async () => {
      queryMock.mockResolvedValueOnce([
        buildRow({ usage_pct: 40, idle: 35, max_idle_seconds: 30 })
      ])

      const signal = await getPostgresConnectionSaturationSignal()

      expect(signal.severity).toBe('ok')
      expect(signal.summary).not.toMatch(/idle conns/)
    })
  })

  describe('graceful degradation', () => {
    it('returns unknown severity + captureWithDomain on query failure', async () => {
      queryMock.mockRejectedValueOnce(new Error('connection refused'))

      const signal = await getPostgresConnectionSaturationSignal()

      expect(signal.severity).toBe('unknown')
      expect(signal.summary).toMatch(/Detector falló/)
      expect(captureWithDomainMock).toHaveBeenCalledTimes(1)
      expect(captureWithDomainMock).toHaveBeenCalledWith(
        expect.any(Error),
        'cloud',
        expect.objectContaining({
          tags: expect.objectContaining({ source: 'reliability_signal_postgres_connection_saturation' })
        })
      )
    })
  })

  describe('evidence references', () => {
    it('attaches all canonical metric + doc refs', async () => {
      queryMock.mockResolvedValueOnce([buildRow()])

      const signal = await getPostgresConnectionSaturationSignal()
      const evidenceLabels = (signal.evidence ?? []).map(e => e.label)

      expect(evidenceLabels).toContain('usage_pct')
      expect(evidenceLabels).toContain('total_conns')
      expect(evidenceLabels).toContain('usable_max')
      expect(evidenceLabels).toContain('idle')
      expect(evidenceLabels).toContain('app_conns')
      expect(evidenceLabels).toContain('ops_conns')
      expect(evidenceLabels).toContain('Detector')
      expect(evidenceLabels).toContain('ADR')
      expect(evidenceLabels).toContain('V2 trigger')
    })
  })
})
