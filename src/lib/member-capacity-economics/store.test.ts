import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

describe('member-capacity-economics store schema guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('checks member_capacity_economics without runtime DDL', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const { ensureMemberCapacityEconomicsSchema } = await import('./store')

    await ensureMemberCapacityEconomicsSchema()

    const sql = String(mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] ?? '')

    expect(sql).toContain('FROM greenhouse_serving.member_capacity_economics')
    expect(sql).not.toMatch(/CREATE\s+TABLE/i)
  })
})
