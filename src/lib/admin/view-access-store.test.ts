import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockClientQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(),
  withGreenhousePostgresTransaction: async (
    callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>
  ) => callback({ query: mockClientQuery })
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

const { VIEW_REGISTRY } = await import('./view-access-catalog')
const { syncViewRegistryCatalog } = await import('./view-access-store')

describe('syncViewRegistryCatalog', () => {
  beforeEach(() => {
    mockClientQuery.mockReset()
    mockClientQuery.mockResolvedValue({ rows: [] })
  })

  it('bulk upserts the view registry instead of issuing one query per view', async () => {
    await syncViewRegistryCatalog('agent-test')

    expect(mockClientQuery).toHaveBeenCalledTimes(2)

    const [upsertSql, upsertParams] = mockClientQuery.mock.calls[0]
    const [deactivateSql] = mockClientQuery.mock.calls[1]

    expect(String(upsertSql)).toContain('UNNEST')
    expect(String(upsertSql)).toContain('ON CONFLICT (view_code) DO UPDATE')
    expect(String(deactivateSql)).toContain('view_code <> ALL($2::text[])')

    expect(upsertParams[0]).toHaveLength(VIEW_REGISTRY.length)
    expect(upsertParams[0]).toEqual(VIEW_REGISTRY.map(view => view.viewCode))
    expect(upsertParams[7]).toBe('agent-test')
  })
})
