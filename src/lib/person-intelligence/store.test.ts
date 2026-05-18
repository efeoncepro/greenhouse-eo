import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

describe('person-intelligence store schema guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('checks person_operational_360 without runtime DDL', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const { ensurePersonIntelligenceSchema } = await import('./store')

    await ensurePersonIntelligenceSchema()

    const sql = String(mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('FROM greenhouse_serving.person_operational_360')
    expect(sql).not.toMatch(/CREATE\s+TABLE/i)
  })
})
