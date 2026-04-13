import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkAuthorization } from './auth'

// ─── Mocks for reactive-queue-depth ─────────────────────────────────────────
// The queue-depth handler depends on postgres + the projection registry. We
// mock both so the test never touches Cloud SQL and is deterministic.

const mockRunGreenhousePostgresQuery = vi.fn()
const mockGetAllTriggerEventTypes = vi.fn()
const mockEnsureProjectionsRegistered = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/sync/projection-registry', () => ({
  PROJECTION_DOMAINS: [
    'organization',
    'people',
    'finance',
    'notifications',
    'delivery',
    'cost_intelligence'
  ] as const,
  getAllTriggerEventTypes: (...args: unknown[]) => mockGetAllTriggerEventTypes(...args)
}))

vi.mock('@/lib/sync/projections', () => ({
  ensureProjectionsRegistered: (...args: unknown[]) => mockEnsureProjectionsRegistered(...args)
}))

import { getReactiveQueueDepth, InvalidDomainError } from './reactive-queue-depth'

describe('checkAuthorization', () => {
  describe('when CRON_SECRET is empty (Cloud Run IAM only)', () => {
    it('allows any request', () => {
      expect(checkAuthorization(undefined, '')).toBe(true)
      expect(checkAuthorization('', '')).toBe(true)
      expect(checkAuthorization('Bearer anything', '')).toBe(true)
      expect(checkAuthorization('garbage', '')).toBe(true)
    })
  })

  describe('when CRON_SECRET is set', () => {
    const secret = 'my-cron-secret-2026'

    it('allows valid Bearer token', () => {
      expect(checkAuthorization(`Bearer ${secret}`, secret)).toBe(true)
    })

    it('allows valid Bearer token (case-insensitive prefix)', () => {
      expect(checkAuthorization(`bearer ${secret}`, secret)).toBe(true)
      expect(checkAuthorization(`BEARER ${secret}`, secret)).toBe(true)
    })

    it('rejects invalid Bearer token', () => {
      expect(checkAuthorization('Bearer wrong-token', secret)).toBe(false)
    })

    it('rejects empty Bearer token', () => {
      expect(checkAuthorization('Bearer ', secret)).toBe(false)
    })

    it('allows request with no Authorization header (passed IAM)', () => {
      expect(checkAuthorization(undefined, secret)).toBe(true)
      expect(checkAuthorization('', secret)).toBe(true)
    })

    it('rejects non-Bearer auth schemes', () => {
      expect(checkAuthorization('Basic dXNlcjpwYXNz', secret)).toBe(false)
      expect(checkAuthorization('Token some-token', secret)).toBe(false)
    })

    it('rejects partial Bearer prefix', () => {
      expect(checkAuthorization('Bear my-cron-secret-2026', secret)).toBe(false)
    })
  })
})

describe('GET /reactive/queue-depth — getReactiveQueueDepth()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureProjectionsRegistered.mockReturnValue(undefined)
  })

  describe('auth — checkAuthorization branch applied by the router', () => {
    // The /reactive/queue-depth route is gated by the same checkAuthorization
    // middleware as the other endpoints. When a CRON_SECRET is configured,
    // a request with no Bearer token (and no IAM passthrough) is rejected.
    const secret = 'queue-depth-secret'

    it('rejects a request that presents a non-Bearer Authorization header', () => {
      expect(checkAuthorization('Basic dXNlcjpwYXNz', secret)).toBe(false)
    })

    it('rejects a request with a malformed Bearer token', () => {
      expect(checkAuthorization('Bearer wrong', secret)).toBe(false)
    })

    it('accepts a request with the correct Bearer token', () => {
      expect(checkAuthorization(`Bearer ${secret}`, secret)).toBe(true)
    })
  })

  describe('successful response shape', () => {
    it('returns queueDepth, oldestEventAge_seconds and perEventType for a valid domain', async () => {
      mockGetAllTriggerEventTypes.mockReturnValue([
        'provider.tooling_snapshot.materialized',
        'finance.invoice.issued'
      ])

      // totals query, then per-event-type query
      mockRunGreenhousePostgresQuery
        .mockResolvedValueOnce([
          {
            total: 5040,
            oldest_occurred_at: '2026-04-06T12:00:00.000Z',
            oldest_age_seconds: 86400
          }
        ])
        .mockResolvedValueOnce([
          { event_type: 'provider.tooling_snapshot.materialized', count: 5040 },
          { event_type: 'finance.invoice.issued', count: 12 }
        ])

      const result = await getReactiveQueueDepth('finance')

      expect(mockEnsureProjectionsRegistered).toHaveBeenCalledTimes(1)
      expect(mockGetAllTriggerEventTypes).toHaveBeenCalledWith('finance')
      expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(2)

      expect(result).toEqual({
        domain: 'finance',
        queueDepth: 5040,
        oldestEventAge_seconds: 86400,
        oldestOccurredAt: '2026-04-06T12:00:00.000Z',
        perEventType: [
          { eventType: 'provider.tooling_snapshot.materialized', count: 5040 },
          { eventType: 'finance.invoice.issued', count: 12 }
        ]
      })
    })

    it('coerces string numerics returned by the pg driver', async () => {
      mockGetAllTriggerEventTypes.mockReturnValue(['x.event'])
      mockRunGreenhousePostgresQuery
        .mockResolvedValueOnce([
          { total: '42', oldest_occurred_at: '2026-04-10T00:00:00.000Z', oldest_age_seconds: '300.5' }
        ])
        .mockResolvedValueOnce([{ event_type: 'x.event', count: '42' }])

      const result = await getReactiveQueueDepth('organization')

      expect(result.queueDepth).toBe(42)
      expect(result.oldestEventAge_seconds).toBe(300.5)
      expect(result.perEventType[0]).toEqual({ eventType: 'x.event', count: 42 })
    })

    it('returns domain="all" with zero depth when no projections are registered for the scope', async () => {
      mockGetAllTriggerEventTypes.mockReturnValue([])

      const result = await getReactiveQueueDepth(undefined)

      expect(result).toEqual({
        domain: 'all',
        queueDepth: 0,
        oldestEventAge_seconds: null,
        oldestOccurredAt: null,
        perEventType: []
      })
      expect(mockRunGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('treats an empty-string domain param as "all"', async () => {
      mockGetAllTriggerEventTypes.mockReturnValue(['any.event'])
      mockRunGreenhousePostgresQuery
        .mockResolvedValueOnce([{ total: 0, oldest_occurred_at: null, oldest_age_seconds: null }])
        .mockResolvedValueOnce([])

      const result = await getReactiveQueueDepth('')

      expect(mockGetAllTriggerEventTypes).toHaveBeenCalledWith(undefined)
      expect(result.domain).toBe('all')
      expect(result.queueDepth).toBe(0)
      expect(result.oldestEventAge_seconds).toBeNull()
    })
  })

  describe('invalid domain handling', () => {
    it('throws InvalidDomainError when domain is not a registered ProjectionDomain', async () => {
      await expect(getReactiveQueueDepth('not-a-real-domain')).rejects.toBeInstanceOf(InvalidDomainError)
      expect(mockRunGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('InvalidDomainError exposes the list of valid domains for the 400 response', async () => {
      try {
        await getReactiveQueueDepth('nope')
        throw new Error('expected InvalidDomainError')
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidDomainError)
        const err = error as InvalidDomainError

        expect(err.validDomains).toContain('finance')
        expect(err.validDomains).toContain('delivery')
        expect(err.message).toMatch(/Invalid domain: nope/)
      }
    })
  })
})
