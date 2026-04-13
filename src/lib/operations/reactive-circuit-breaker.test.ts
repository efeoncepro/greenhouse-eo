import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

import {
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  evaluateCircuit,
  recordFailure,
  recordSuccess,
  type CircuitBreakerConfig
} from './reactive-circuit-breaker'

const baseRow = (overrides: Record<string, unknown> = {}) => ({
  projection_name: 'test_projection',
  state: 'closed',
  consecutive_failures: 0,
  total_runs_window: 0,
  failed_runs_window: 0,
  window_started_at: '2026-04-13T00:00:00Z',
  opened_at: null,
  half_open_probe_at: null,
  last_error: null,
  last_failure_at: null,
  last_success_at: null,
  updated_at: '2026-04-13T00:00:00Z',
  ...overrides
})

const config: CircuitBreakerConfig = {
  ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
  minimumRunsForEvaluation: 5,
  failureRateThreshold: 0.5,
  consecutiveFailureThreshold: 3,
  cooldownMs: 60_000,
  rollingWindowSize: 20
}

describe('reactive-circuit-breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('evaluateCircuit', () => {
    it('allows normal processing when no state row exists', async () => {
      mockQuery.mockResolvedValueOnce([])

      const result = await evaluateCircuit('fresh_projection', config)

      expect(result.allow).toBe(true)
      expect(result.mode).toBe('normal')
      expect(result.snapshot).toBeNull()
    })

    it('allows normal processing when state is closed', async () => {
      mockQuery.mockResolvedValueOnce([baseRow({ state: 'closed' })])

      const result = await evaluateCircuit('test_projection', config)

      expect(result.allow).toBe(true)
      expect(result.mode).toBe('normal')
    })

    it('blocks when state is open and cooldown not yet expired', async () => {
      const now = new Date('2026-04-13T12:00:00Z')
      const openedAt = new Date('2026-04-13T11:59:30Z') // 30s ago, cooldown is 60s

      mockQuery.mockResolvedValueOnce([
        baseRow({ state: 'open', opened_at: openedAt.toISOString() })
      ])

      const result = await evaluateCircuit('test_projection', config, now)

      expect(result.allow).toBe(false)
      expect(result.mode).toBe('blocked')
    })

    it('transitions to half_open and allows probe when cooldown expired', async () => {
      const now = new Date('2026-04-13T12:00:00Z')
      const openedAt = new Date('2026-04-13T11:58:00Z') // 2 min ago, cooldown 60s elapsed

      // 1st query: read current state (open, expired)
      mockQuery.mockResolvedValueOnce([
        baseRow({ state: 'open', opened_at: openedAt.toISOString() })
      ])

      // 2nd query: UPDATE to half_open
      mockQuery.mockResolvedValueOnce([])

      // 3rd query: read back refreshed state
      mockQuery.mockResolvedValueOnce([
        baseRow({ state: 'half_open', half_open_probe_at: now.toISOString(), opened_at: openedAt.toISOString() })
      ])

      const result = await evaluateCircuit('test_projection', config, now)

      expect(result.allow).toBe(true)
      expect(result.mode).toBe('probe')
      expect(result.snapshot?.state).toBe('half_open')

      // The UPDATE query was issued
      expect(mockQuery).toHaveBeenCalledTimes(3)
    })

    it('allows probe when state is already half_open', async () => {
      mockQuery.mockResolvedValueOnce([
        baseRow({ state: 'half_open', half_open_probe_at: '2026-04-13T12:00:00Z' })
      ])

      const result = await evaluateCircuit('test_projection', config)

      expect(result.allow).toBe(true)
      expect(result.mode).toBe('probe')
    })
  })

  describe('recordSuccess', () => {
    it('issues an UPSERT closing the breaker', async () => {
      mockQuery.mockResolvedValueOnce([])

      await recordSuccess('test_projection', config)

      expect(mockQuery).toHaveBeenCalledTimes(1)
      const [sql, params] = mockQuery.mock.calls[0]

      expect(sql).toContain('INSERT INTO greenhouse_sync.projection_circuit_state')
      expect(sql).toContain("state = 'closed'")
      expect(params).toEqual(['test_projection', expect.any(String), config.rollingWindowSize])
    })
  })

  describe('recordFailure', () => {
    it('inserts a failure row and re-reads state', async () => {
      // 1: upsert
      mockQuery.mockResolvedValueOnce([])

      // 2: re-read after upsert
      mockQuery.mockResolvedValueOnce([
        baseRow({
          consecutive_failures: 1,
          total_runs_window: 1,
          failed_runs_window: 1,
          last_error: 'boom'
        })
      ])

      const snapshot = await recordFailure('test_projection', 'boom', config)

      expect(snapshot.consecutiveFailures).toBe(1)
      expect(snapshot.lastError).toBe('boom')
      expect(snapshot.state).toBe('closed') // not yet tripped
    })

    it('trips the breaker when consecutive failures exceed threshold', async () => {
      // 1: upsert
      mockQuery.mockResolvedValueOnce([])

      // 2: re-read after upsert (3rd consecutive failure — equal to threshold)
      mockQuery.mockResolvedValueOnce([
        baseRow({
          consecutive_failures: 3,
          total_runs_window: 3,
          failed_runs_window: 3,
          last_error: 'boom'
        })
      ])

      // 3: UPDATE to open
      mockQuery.mockResolvedValueOnce([])

      // 4: re-read after open
      mockQuery.mockResolvedValueOnce([
        baseRow({
          state: 'open',
          consecutive_failures: 3,
          total_runs_window: 3,
          failed_runs_window: 3,
          opened_at: '2026-04-13T12:00:00Z',
          last_error: 'boom'
        })
      ])

      const snapshot = await recordFailure('test_projection', 'boom', config)

      expect(snapshot.state).toBe('open')
      expect(mockQuery).toHaveBeenCalledTimes(4)

      // The 3rd query should be the UPDATE to 'open'
      const [openSql] = mockQuery.mock.calls[2]

      expect(openSql).toContain("state = 'open'")
    })

    it('trips the breaker when failure rate breaches threshold (rate-based)', async () => {
      // 1: upsert
      mockQuery.mockResolvedValueOnce([])

      // 2: re-read showing 5 runs / 3 failures = 60% > threshold of 50%, but consecutive=2 < 3
      mockQuery.mockResolvedValueOnce([
        baseRow({
          consecutive_failures: 2,
          total_runs_window: 5,
          failed_runs_window: 3,
          last_error: 'rate-trip'
        })
      ])

      // 3: UPDATE to open
      mockQuery.mockResolvedValueOnce([])

      // 4: re-read
      mockQuery.mockResolvedValueOnce([
        baseRow({
          state: 'open',
          consecutive_failures: 2,
          total_runs_window: 5,
          failed_runs_window: 3,
          opened_at: '2026-04-13T12:00:00Z',
          last_error: 'rate-trip'
        })
      ])

      const snapshot = await recordFailure('test_projection', 'rate-trip', config)

      expect(snapshot.state).toBe('open')
    })

    it('does NOT trip when neither threshold breached', async () => {
      // 1: upsert
      mockQuery.mockResolvedValueOnce([])

      // 2: re-read showing 4 runs / 1 failure = 25% < 50%, consecutive=1 < 3
      mockQuery.mockResolvedValueOnce([
        baseRow({
          consecutive_failures: 1,
          total_runs_window: 4,
          failed_runs_window: 1,
          last_error: 'transient'
        })
      ])

      const snapshot = await recordFailure('test_projection', 'transient', config)

      expect(snapshot.state).toBe('closed')

      // Only 2 queries: upsert + re-read. No UPDATE to open.
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })

    it('reopens immediately when a failure happens during half_open probe', async () => {
      // 1: upsert
      mockQuery.mockResolvedValueOnce([])

      // 2: re-read shows half_open_probe_at set (was probing) but state still in transition
      mockQuery.mockResolvedValueOnce([
        baseRow({
          consecutive_failures: 1,
          total_runs_window: 1,
          failed_runs_window: 1,
          half_open_probe_at: '2026-04-13T12:00:00Z',
          state: 'closed', // state value irrelevant here; the half_open_probe_at being non-null is the trigger
          last_error: 'probe-failed'
        })
      ])

      // 3: UPDATE to open
      mockQuery.mockResolvedValueOnce([])

      // 4: re-read post-open
      mockQuery.mockResolvedValueOnce([
        baseRow({
          state: 'open',
          consecutive_failures: 1,
          total_runs_window: 1,
          failed_runs_window: 1,
          opened_at: '2026-04-13T12:00:00Z',
          last_error: 'probe-failed'
        })
      ])

      const snapshot = await recordFailure('test_projection', 'probe-failed', config)

      expect(snapshot.state).toBe('open')
    })

    it('truncates very long error messages to 1000 characters', async () => {
      mockQuery.mockResolvedValueOnce([])
      mockQuery.mockResolvedValueOnce([baseRow()])

      const longError = 'x'.repeat(2000)

      await recordFailure('test_projection', longError, config)

      const [, params] = mockQuery.mock.calls[0]
      const persistedError = params[2] as string

      expect(persistedError.length).toBe(1000)
      expect(persistedError.endsWith('...')).toBe(true)
    })
  })
})
