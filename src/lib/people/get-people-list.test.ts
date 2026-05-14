import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockIsConfigured = vi.fn<() => boolean>()
const mockPgQuery = vi.fn()
const mockBqQuery = vi.fn()
const mockGetColumns = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  isGreenhousePostgresConfigured: () => mockIsConfigured(),
  runGreenhousePostgresQuery: (...args: unknown[]) => mockPgQuery(...args)
}))

vi.mock('@/lib/bigquery', () => ({
  getBigQueryProjectId: () => 'test-project'
}))

vi.mock('@/lib/people/shared', () => ({
  getPeopleTableColumns: (...args: unknown[]) => mockGetColumns(...args),
  runPeopleQuery: (...args: unknown[]) => mockBqQuery(...args),
  pickMemberEmails: ({ email, emailAliases }: { email: string | null; emailAliases: string[] }) => ({
    publicEmail: email || '',
    internalEmail: emailAliases?.find((e: string) => e?.includes?.('@efeonce')) || null
  }),
  roundToTenths: (n: number) => Math.round(n * 10) / 10,
  toNumber: (v: unknown) => Number(v) || 0,
  toStringArray: (v: unknown) => (Array.isArray(v) ? v : [])
}))


const mockCapacityBatch = vi.fn()

vi.mock('@/lib/member-capacity-economics/store', () => ({
  readMemberCapacityEconomicsBatch: (...args: unknown[]) => mockCapacityBatch(...args)
}))

import { getPeopleList } from '@/lib/people/get-people-list'

const makeSnapshot = (memberId: string, overrides: Record<string, unknown> = {}) => ({
  memberId,
  contractedFte: 1,
  assignedHours: 128,
  assignmentCount: 2,
  ...overrides
})

const setupCapacityBatch = (entries: Array<{ memberId: string; [k: string]: unknown }> = []) => {
  const map = new Map(entries.map(e => [e.memberId, e]))

  mockCapacityBatch.mockResolvedValue(map)
}

const makePgRow = (overrides: Record<string, unknown> = {}) => ({
  member_id: 'member-1',
  display_name: 'Test Person',
  email: 'test@efeonce.com',
  email_aliases: [] as string[],
  role_title: 'Developer',
  role_category: 'development',
  avatar_url: null,
  location_country: 'CL',
  active: true,
  pay_regime: 'chile',
  ...overrides
})

const setupBigQueryFallback = (rows: Record<string, unknown>[] = [makePgRow()], coveredClients = 3) => {
  mockGetColumns
    .mockResolvedValueOnce(new Set(['email_aliases', 'location_country']))
    .mockResolvedValueOnce(new Set(['pay_regime', 'is_current', 'member_id']))
  mockBqQuery
    .mockResolvedValueOnce(rows)
    .mockResolvedValueOnce([{ covered_clients: coveredClients }])
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCapacityBatch.mockResolvedValue(new Map())
})

describe('getPeopleList', () => {
  describe('Postgres-first path', () => {
    it('returns data from Postgres enriched with capacity snapshot', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery
        .mockResolvedValueOnce([makePgRow()])
        .mockResolvedValueOnce([{ covered_clients: 5 }])
      setupCapacityBatch([makeSnapshot('member-1', { contractedFte: 1, assignedHours: 128, assignmentCount: 2 })])

      const result = await getPeopleList()

      expect(mockPgQuery).toHaveBeenCalled()
      expect(mockBqQuery).not.toHaveBeenCalled()
      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toMatchObject({
        memberId: 'member-1',
        displayName: 'Test Person',
        publicEmail: 'test@efeonce.com',
        roleCategory: 'development',
        active: true,
        contractedFte: 1,
        assignedFte: 0.8,
        totalAssignments: 2,
        payRegime: 'chile'
      })
      expect(result.summary.coveredClients).toBe(5)
    })

    it('resolves Person 360 gs avatar assets to the protected media proxy', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery
        .mockResolvedValueOnce([
          makePgRow({
            avatar_url: 'gs://greenhouse-media/users/user-1/avatar.jpg',
            avatar_user_id: 'user-1'
          })
        ])
        .mockResolvedValueOnce([{ covered_clients: 5 }])

      const result = await getPeopleList()

      expect(result.items[0].avatarUrl).toBe('/api/media/users/user-1/avatar')
    })

    it('keeps the people roster available when capacity snapshot access is denied', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery
        .mockResolvedValueOnce([makePgRow()])
        .mockResolvedValueOnce([{ covered_clients: 5 }])
      mockCapacityBatch.mockRejectedValueOnce(new Error('permission denied for table member_capacity_economics'))

      const result = await getPeopleList()

      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toMatchObject({
        memberId: 'member-1',
        displayName: 'Test Person',
        contractedFte: 1,
        assignedFte: 0,
        totalAssignments: 0
      })
      expect(result.summary.coveredClients).toBe(5)
    })

    it('computes summary from capacity snapshots', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery
        .mockResolvedValueOnce([
          makePgRow({ member_id: 'm-1', active: true, pay_regime: 'chile' }),
          makePgRow({ member_id: 'm-2', active: true, pay_regime: 'international' }),
          makePgRow({ member_id: 'm-3', active: false, pay_regime: null })
        ])
        .mockResolvedValueOnce([{ covered_clients: 10 }])
      setupCapacityBatch([
        makeSnapshot('m-1', { contractedFte: 0.5 }),
        makeSnapshot('m-2', { contractedFte: 1.0 }),
        makeSnapshot('m-3', { contractedFte: 0 })
      ])

      const result = await getPeopleList()

      expect(result.summary.activeMembers).toBe(2)
      expect(result.summary.totalFte).toBe(1.5)
      expect(result.summary.coveredClients).toBe(10)
      expect(result.summary.chileCount).toBe(1)
      expect(result.summary.internationalCount).toBe(1)
    })

    it('builds role category filters from items', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery
        .mockResolvedValueOnce([
          makePgRow({ member_id: 'm-1', role_category: 'development' }),
          makePgRow({ member_id: 'm-2', role_category: 'development' }),
          makePgRow({ member_id: 'm-3', role_category: 'design' })
        ])
        .mockResolvedValueOnce([{ covered_clients: 5 }])

      const result = await getPeopleList()

      expect(result.filters.roleCategories).toEqual([
        { roleCategory: 'development', count: 2 },
        { roleCategory: 'design', count: 1 }
      ])
    })

    it('builds country filters from items', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery
        .mockResolvedValueOnce([
          makePgRow({ member_id: 'm-1', location_country: 'CL' }),
          makePgRow({ member_id: 'm-2', location_country: 'CL' }),
          makePgRow({ member_id: 'm-3', location_country: 'CO' })
        ])
        .mockResolvedValueOnce([{ covered_clients: 5 }])

      const result = await getPeopleList()

      expect(result.filters.countries).toEqual([
        { countryCode: 'CL', count: 2 },
        { countryCode: 'CO', count: 1 }
      ])
    })

    it('builds pay regime filters from items', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery
        .mockResolvedValueOnce([
          makePgRow({ member_id: 'm-1', pay_regime: 'chile' }),
          makePgRow({ member_id: 'm-2', pay_regime: 'international' }),
          makePgRow({ member_id: 'm-3', pay_regime: null })
        ])
        .mockResolvedValueOnce([{ covered_clients: 5 }])

      const result = await getPeopleList()

      expect(result.filters.payRegimes).toEqual([
        { payRegime: 'chile', count: 1 },
        { payRegime: 'international', count: 1 },
        { payRegime: 'unknown', count: 1 }
      ])
    })
  })

  describe('BigQuery fallback', () => {
    it('uses BigQuery when Postgres is not configured', async () => {
      mockIsConfigured.mockReturnValue(false)
      setupBigQueryFallback()

      const result = await getPeopleList()

      expect(mockPgQuery).not.toHaveBeenCalled()
      expect(mockBqQuery).toHaveBeenCalled()
      expect(result.items).toHaveLength(1)
    })

    it('falls back to BigQuery on ECONNREFUSED', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery.mockRejectedValueOnce(new Error('connect ECONNREFUSED 10.0.0.1:5432'))
      setupBigQueryFallback()

      const result = await getPeopleList()

      expect(mockBqQuery).toHaveBeenCalled()
      expect(result.items).toHaveLength(1)
    })

    it('falls back to BigQuery on timeout', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery.mockRejectedValueOnce(new Error('Query read timeout'))
      setupBigQueryFallback()

      const result = await getPeopleList()

      expect(mockBqQuery).toHaveBeenCalled()
      expect(result.items).toHaveLength(1)
    })

    it('falls back on "relation does not exist"', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery.mockRejectedValueOnce(new Error('relation "greenhouse_core.members" does not exist'))
      setupBigQueryFallback()

      const result = await getPeopleList()

      expect(mockBqQuery).toHaveBeenCalled()
      expect(result.items).toHaveLength(1)
    })

    it('falls back on Cloud SQL connection error', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery.mockRejectedValueOnce(new Error('Cloud SQL instance not reachable'))
      setupBigQueryFallback()

      const result = await getPeopleList()

      expect(mockBqQuery).toHaveBeenCalled()
      expect(result.items).toHaveLength(1)
    })

    it('falls back on "not configured" error', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery.mockRejectedValueOnce(new Error('PostgreSQL not configured'))
      setupBigQueryFallback()

      const result = await getPeopleList()

      expect(mockBqQuery).toHaveBeenCalled()
      expect(result.items).toHaveLength(1)
    })
  })

  describe('error propagation', () => {
    it('propagates non-transient Postgres errors', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery.mockRejectedValueOnce(new Error('syntax error at position 42'))

      await expect(getPeopleList()).rejects.toThrow('syntax error at position 42')
      expect(mockBqQuery).not.toHaveBeenCalled()
    })

    it('propagates non-Error throwables', async () => {
      mockIsConfigured.mockReturnValue(true)
      mockPgQuery.mockRejectedValueOnce('unexpected string error')

      await expect(getPeopleList()).rejects.toBe('unexpected string error')
    })
  })
})
